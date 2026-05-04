import { create } from "zustand";
import {
  DEFAULT_CALIBRATION_DURATION_MS,
  createDefaultPumpCalibrationConfig,
  normalizeCalibrationPointCount,
  normalizePumpCalibrationConfig,
  normalizePumpVMax,
  normalizePumpVoltage,
  type PumpCalibrationConfigByRowId,
  type PumpCalibrationSetFile,
  type PumpCalibrationPoint,
} from "@/lib/pump-calibration";
import type { Direction } from "@/types/scheduler";

interface PumpCalibrationState {
  vMax: number;
  points: PumpCalibrationPoint[];
  calibrationsByRowId: PumpCalibrationConfigByRowId;
  lastCalibrationFileName: string;
  runRowId: string | null;
  runDurationMs: number;
  runVoltage: number;
  runDirection: Direction;
  statusMessage: string;
  setVMax: (vMax: number) => void;
  setPointCount: (pointCount: number) => void;
  setPointMeasuredFlow: (pointId: string, measuredFlowRate: number | null) => void;
  setRunRowId: (rowId: string | null) => void;
  setRunDurationMs: (durationMs: number) => void;
  setRunVoltage: (voltage: number) => void;
  setRunDirection: (direction: Direction) => void;
  setStatusMessage: (message: string) => void;
  setLastCalibrationFileName: (fileName: string) => void;
  importCalibrationSet: (file: PumpCalibrationSetFile, fileName?: string) => void;
}

function normalizeMeasuredFlowRate(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Number(value.toFixed(3)));
}

function getCalibrationForRow(
  calibrationsByRowId: PumpCalibrationConfigByRowId,
  rowId: string | null,
) {
  return normalizePumpCalibrationConfig(
    rowId ? calibrationsByRowId[rowId] : createDefaultPumpCalibrationConfig(),
  );
}

function withActiveCalibration(
  state: PumpCalibrationState,
  calibration: ReturnType<typeof normalizePumpCalibrationConfig>,
) {
  return {
    vMax: calibration.vMax,
    points: calibration.points,
    calibrationsByRowId: state.runRowId
      ? {
          ...state.calibrationsByRowId,
          [state.runRowId]: calibration,
        }
      : state.calibrationsByRowId,
  };
}

const defaultCalibration = createDefaultPumpCalibrationConfig();

export const usePumpCalibrationStore = create<PumpCalibrationState>((set) => ({
  vMax: defaultCalibration.vMax,
  points: defaultCalibration.points,
  calibrationsByRowId: {},
  lastCalibrationFileName: "",
  runRowId: null,
  runDurationMs: DEFAULT_CALIBRATION_DURATION_MS,
  runVoltage: 2.5,
  runDirection: "forward",
  statusMessage: "",
  setVMax: (vMax) =>
    set((state) => {
      const nextVMax = normalizePumpVMax(vMax);
      const calibration = normalizePumpCalibrationConfig({
        vMax: nextVMax,
        points: state.points,
      });

      return {
        ...withActiveCalibration(state, calibration),
        runVoltage: normalizePumpVoltage(state.runVoltage, nextVMax),
      };
    }),
  setPointCount: (pointCount) =>
    set((state) => {
      const nextPointCount = normalizeCalibrationPointCount(pointCount);
      const nextPoints = Array.from({ length: nextPointCount }, (_, index) => {
        return (
          state.points[index] ?? {
            id: `cal-point-${index + 1}`,
            measuredFlowRate: null,
          }
        );
      });

      const calibration = normalizePumpCalibrationConfig({
        vMax: state.vMax,
        points: nextPoints,
      });

      return withActiveCalibration(state, calibration);
    }),
  setPointMeasuredFlow: (pointId, measuredFlowRate) =>
    set((state) => {
      const nextPoints = state.points.map((point) =>
        point.id === pointId
          ? {
              ...point,
              measuredFlowRate: normalizeMeasuredFlowRate(measuredFlowRate),
            }
          : point,
      );
      const calibration = normalizePumpCalibrationConfig({
        vMax: state.vMax,
        points: nextPoints,
      });

      return withActiveCalibration(state, calibration);
    }),
  setRunRowId: (runRowId) =>
    set((state) => {
      const calibration = getCalibrationForRow(state.calibrationsByRowId, runRowId);

      return {
        runRowId,
        vMax: calibration.vMax,
        points: calibration.points,
        calibrationsByRowId: runRowId
          ? {
              ...state.calibrationsByRowId,
              [runRowId]: calibration,
            }
          : state.calibrationsByRowId,
        runVoltage: normalizePumpVoltage(state.runVoltage, calibration.vMax),
      };
    }),
  setRunDurationMs: (runDurationMs) =>
    set({
      runDurationMs: Math.max(500, Math.round(Number.isFinite(runDurationMs) ? runDurationMs : 500)),
    }),
  setRunVoltage: (runVoltage) =>
    set((state) => ({
      runVoltage: normalizePumpVoltage(runVoltage, state.vMax),
    })),
  setRunDirection: (runDirection) => set({ runDirection }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setLastCalibrationFileName: (lastCalibrationFileName) => set({ lastCalibrationFileName }),
  importCalibrationSet: (file, fileName = "") =>
    set((state) => {
      const calibrationsByRowId = Object.fromEntries(
        Object.entries(file.calibrationsByRowId ?? {}).map(([rowId, calibration]) => [
          rowId,
          normalizePumpCalibrationConfig(calibration),
        ]),
      );
      const nextRunRowId =
        state.runRowId && calibrationsByRowId[state.runRowId]
          ? state.runRowId
          : file.activeRowId && calibrationsByRowId[file.activeRowId]
            ? file.activeRowId
            : Object.keys(calibrationsByRowId)[0] ?? null;
      const activeCalibration = getCalibrationForRow(calibrationsByRowId, nextRunRowId);

      return {
        calibrationsByRowId,
        runRowId: nextRunRowId,
        vMax: activeCalibration.vMax,
        points: activeCalibration.points,
        runVoltage: normalizePumpVoltage(state.runVoltage, activeCalibration.vMax),
        lastCalibrationFileName: fileName || state.lastCalibrationFileName,
        statusMessage: fileName ? `Loaded calibration file ${fileName}.` : state.statusMessage,
      };
    }),
}));
