import type { DeviceSlotInfo } from "@/store/board-store";
import type { DeviceType, Row } from "@/types/scheduler";

export interface HardwareOption {
  value: number;
  label: string;
  shortLabel: string;
}

export function getGpioPinLabel(pin: number) {
  if (pin < 16) {
    return `5V OUT ${pin}`;
  }

  return `3.3V OUT ${pin - 16}`;
}

export function getGpioPinOptions(): HardwareOption[] {
  return Array.from({ length: 32 }, (_, pin) => ({
    value: pin,
    label: `${getGpioPinLabel(pin)} (GPIO ${pin})`,
    shortLabel: getGpioPinLabel(pin),
  }));
}

export function getPumpIndexLabel(pumpIndex: number) {
  const slot = Math.floor(pumpIndex / 8);
  const localPump = pumpIndex % 8;
  return `Pump ${pumpIndex} (slot ${slot}, channel ${localPump})`;
}

export function getPumpIndexShortLabel(pumpIndex: number) {
  return `Pump ${pumpIndex}`;
}

export function getDetectedPumpOptions(slots: DeviceSlotInfo[]): HardwareOption[] {
  return slots
    .filter((slot) => slot.present && slot.cardType === "pump")
    .flatMap((slot) =>
      Array.from({ length: 8 }, (_, localPump) => {
        const pumpIndex = slot.slot * 8 + localPump;

        return {
          value: pumpIndex,
          label: getPumpIndexLabel(pumpIndex),
          shortLabel: getPumpIndexShortLabel(pumpIndex),
        };
      }),
    );
}

export function getHardwareOptions(
  deviceType: DeviceType,
  detectedSlots: DeviceSlotInfo[],
) {
  return deviceType === "trigger"
    ? getGpioPinOptions()
    : getDetectedPumpOptions(detectedSlots);
}

export function getHardwareShortLabel(deviceType: DeviceType, hardwareId: number) {
  return deviceType === "trigger"
    ? getGpioPinLabel(hardwareId)
    : getPumpIndexShortLabel(hardwareId);
}

export function getHardwareSelectPlaceholder(deviceType: DeviceType) {
  return deviceType === "trigger" ? "Select pin" : "Select pump";
}

export function getUsedHardwareIds(rows: Row[], deviceType: DeviceType, ignoredRowId?: string) {
  return new Set(
    rows
      .filter(
        (row) =>
          row.id !== ignoredRowId &&
          row.deviceType === deviceType &&
          row.hardwareId !== null &&
          row.hardwareId !== undefined,
      )
      .map((row) => row.hardwareId as number),
  );
}

export function isHardwareIdInUse(
  rows: Row[],
  deviceType: DeviceType,
  hardwareId: number,
  ignoredRowId?: string,
) {
  return getUsedHardwareIds(rows, deviceType, ignoredRowId).has(hardwareId);
}
