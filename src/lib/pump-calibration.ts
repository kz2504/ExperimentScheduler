import { clamp } from "@/lib/utils";
import type { Block, Row } from "@/types/scheduler";

export const MAX_PUMP_VOLTAGE = 5;
export const MIN_CALIBRATION_POINTS = 2;
export const DEFAULT_CALIBRATION_POINTS = 5;
export const DEFAULT_CALIBRATION_DURATION_MS = 10_000;
export const DEFAULT_PUMP_FLOW_UL_PER_MIN_PER_VOLT = 200;

export interface PumpCalibrationPoint {
  id: string;
  measuredFlowRate: number | null;
}

export interface PumpCalibrationFit {
  isValid: boolean;
  pointCount: number;
  slopeFlowPerVolt: number;
  interceptFlowRate: number;
  rSquared: number | null;
}

export interface PumpCalibrationConfig {
  vMax: number;
  points: PumpCalibrationPoint[];
}

export type PumpCalibrationConfigByRowId = Record<string, PumpCalibrationConfig>;

export interface PumpCalibrationSetFile {
  kind: "pumpCalibrationSet";
  schemaVersion: 1;
  savedAt: string;
  activeRowId: string | null;
  channelNamesByRowId: Record<string, string>;
  calibrationsByRowId: PumpCalibrationConfigByRowId;
}

export function normalizePumpVoltage(value: number, vMax = MAX_PUMP_VOLTAGE) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return clamp(value, 0, normalizePumpVMax(vMax));
}

export function normalizePumpVMax(value: number) {
  if (!Number.isFinite(value)) {
    return MAX_PUMP_VOLTAGE;
  }

  return clamp(value, 0, MAX_PUMP_VOLTAGE);
}

export function normalizeCalibrationPointCount(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_CALIBRATION_POINTS;
  }

  return Math.max(MIN_CALIBRATION_POINTS, Math.round(value));
}

export function getCalibrationPointVoltage(index: number, pointCount: number, vMax: number) {
  const normalizedPointCount = normalizeCalibrationPointCount(pointCount);

  if (normalizedPointCount <= 1) {
    return 0;
  }

  return (normalizePumpVMax(vMax) * index) / (normalizedPointCount - 1);
}

export function createCalibrationPoints(pointCount = DEFAULT_CALIBRATION_POINTS) {
  return Array.from(
    { length: normalizeCalibrationPointCount(pointCount) },
    (_, index): PumpCalibrationPoint => ({
      id: `cal-point-${index + 1}`,
      measuredFlowRate: null,
    }),
  );
}

export function createDefaultPumpCalibrationConfig(): PumpCalibrationConfig {
  return {
    vMax: MAX_PUMP_VOLTAGE,
    points: createCalibrationPoints(DEFAULT_CALIBRATION_POINTS),
  };
}

export function normalizePumpCalibrationConfig(
  calibration: Partial<PumpCalibrationConfig> | null | undefined,
): PumpCalibrationConfig {
  const vMax = normalizePumpVMax(calibration?.vMax ?? MAX_PUMP_VOLTAGE);
  const sourcePoints =
    Array.isArray(calibration?.points) && calibration.points.length >= MIN_CALIBRATION_POINTS
      ? calibration.points
      : createCalibrationPoints(DEFAULT_CALIBRATION_POINTS);
  const points = sourcePoints.map((point, index) => ({
    id: typeof point.id === "string" && point.id ? point.id : `cal-point-${index + 1}`,
    measuredFlowRate:
      point.measuredFlowRate === null || point.measuredFlowRate === undefined
        ? null
        : Number.isFinite(point.measuredFlowRate)
          ? Math.max(0, Number(point.measuredFlowRate.toFixed(3)))
          : null,
  }));

  return {
    vMax,
    points:
      points.length >= MIN_CALIBRATION_POINTS
        ? points
        : createCalibrationPoints(MIN_CALIBRATION_POINTS),
  };
}

export function getPumpCalibrationFit({
  points,
  vMax,
}: PumpCalibrationConfig): PumpCalibrationFit {
  const usablePoints = points
    .map((point, index) => ({
      voltage: getCalibrationPointVoltage(index, points.length, vMax),
      flowRate: point.measuredFlowRate,
    }))
    .filter(
      (point): point is { voltage: number; flowRate: number } =>
        point.flowRate !== null &&
        Number.isFinite(point.flowRate) &&
        point.flowRate >= 0 &&
        Number.isFinite(point.voltage),
    );

  if (usablePoints.length < MIN_CALIBRATION_POINTS) {
    return {
      isValid: false,
      pointCount: usablePoints.length,
      slopeFlowPerVolt: 0,
      interceptFlowRate: 0,
      rSquared: null,
    };
  }

  const meanVoltage =
    usablePoints.reduce((sum, point) => sum + point.voltage, 0) / usablePoints.length;
  const meanFlow =
    usablePoints.reduce((sum, point) => sum + point.flowRate, 0) / usablePoints.length;
  const voltageVariance = usablePoints.reduce(
    (sum, point) => sum + (point.voltage - meanVoltage) ** 2,
    0,
  );

  if (voltageVariance <= Number.EPSILON) {
    return {
      isValid: false,
      pointCount: usablePoints.length,
      slopeFlowPerVolt: 0,
      interceptFlowRate: 0,
      rSquared: null,
    };
  }

  const covariance = usablePoints.reduce(
    (sum, point) => sum + (point.voltage - meanVoltage) * (point.flowRate - meanFlow),
    0,
  );
  const slopeFlowPerVolt = covariance / voltageVariance;
  const interceptFlowRate = meanFlow - slopeFlowPerVolt * meanVoltage;
  const totalFlowVariance = usablePoints.reduce(
    (sum, point) => sum + (point.flowRate - meanFlow) ** 2,
    0,
  );
  const residualVariance = usablePoints.reduce((sum, point) => {
    const predictedFlow = slopeFlowPerVolt * point.voltage + interceptFlowRate;
    return sum + (point.flowRate - predictedFlow) ** 2;
  }, 0);

  return {
    isValid: slopeFlowPerVolt > 0,
    pointCount: usablePoints.length,
    slopeFlowPerVolt,
    interceptFlowRate,
    rSquared:
      totalFlowVariance <= Number.EPSILON
        ? 1
        : 1 - residualVariance / totalFlowVariance,
  };
}

export function getPumpVoltageForFlowRate(
  flowRate: number,
  fit: PumpCalibrationFit,
  vMax: number,
) {
  if (!Number.isFinite(flowRate) || flowRate <= 0) {
    return 0;
  }

  const voltage = fit.isValid
    ? (flowRate - fit.interceptFlowRate) / fit.slopeFlowPerVolt
    : flowRate / DEFAULT_PUMP_FLOW_UL_PER_MIN_PER_VOLT;

  return normalizePumpVoltage(voltage, vMax);
}

export function encodePumpVoltageAsFirmwareFlowRate(voltage: number, vMax = MAX_PUMP_VOLTAGE) {
  return (
    normalizePumpVoltage(voltage, vMax) *
    DEFAULT_PUMP_FLOW_UL_PER_MIN_PER_VOLT
  );
}

export function applyPumpCalibrationToBlocksByRowId(
  blocks: Block[],
  rows: Row[],
  calibrationsByRowId: PumpCalibrationConfigByRowId,
) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const defaultCalibration = createDefaultPumpCalibrationConfig();

  return blocks.map((block) => {
    const row = rowsById.get(block.rowId);

    if (row?.deviceType !== "peristaltic") {
      return block;
    }

    const calibration = normalizePumpCalibrationConfig(
      calibrationsByRowId[block.rowId] ?? defaultCalibration,
    );
    const fit = getPumpCalibrationFit(calibration);
    const voltage = getPumpVoltageForFlowRate(block.flowRate, fit, calibration.vMax);

    return {
      ...block,
      flowRate: encodePumpVoltageAsFirmwareFlowRate(voltage, calibration.vMax),
    };
  });
}

export function createPumpCalibrationSetFile({
  activeRowId,
  calibrationsByRowId,
  rows,
}: {
  activeRowId: string | null;
  calibrationsByRowId: PumpCalibrationConfigByRowId;
  rows: Row[];
}): PumpCalibrationSetFile {
  const channelNamesByRowId = Object.fromEntries(
    rows
      .filter((row) => row.deviceType === "peristaltic")
      .map((row) => [row.id, row.name]),
  );

  return {
    kind: "pumpCalibrationSet",
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    activeRowId,
    channelNamesByRowId,
    calibrationsByRowId: Object.fromEntries(
      Object.entries(calibrationsByRowId).map(([rowId, calibration]) => [
        rowId,
        normalizePumpCalibrationConfig(calibration),
      ]),
    ),
  };
}
