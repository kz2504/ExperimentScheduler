import type { TriggerMode } from "@/types/scheduler";

export const DEFAULT_TRIGGER_MODE: TriggerMode = "waveform";
export const DEFAULT_TRIGGER_FREQUENCY_HZ = 1;
export const DEFAULT_TRIGGER_DUTY_CYCLE = 50;

export const TRIGGER_MODE_LABELS: Record<TriggerMode, string> = {
  rising: "Rising edge",
  falling: "Falling edge",
  waveform: "PWM waveform",
};

export function normalizeFrequencyHz(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_TRIGGER_FREQUENCY_HZ;
  }

  return value;
}

export function normalizeDutyCycle(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TRIGGER_DUTY_CYCLE;
  }

  return Math.min(100, Math.max(0, value));
}

export function getPeriodMsFromFrequencyHz(frequencyHz: number) {
  return 1_000 / normalizeFrequencyHz(frequencyHz);
}

export function getFrequencyHzFromPeriodMs(periodMs: number) {
  if (!Number.isFinite(periodMs) || periodMs <= 0) {
    return DEFAULT_TRIGGER_FREQUENCY_HZ;
  }

  return normalizeFrequencyHz(1_000 / periodMs);
}

export function getHighTimeMsFromDutyCycle(frequencyHz: number, dutyCycle: number) {
  return getPeriodMsFromFrequencyHz(frequencyHz) * (normalizeDutyCycle(dutyCycle) / 100);
}

export function getDutyCycleFromHighTimeMs(frequencyHz: number, highTimeMs: number) {
  const periodMs = getPeriodMsFromFrequencyHz(frequencyHz);

  if (!Number.isFinite(highTimeMs) || highTimeMs <= 0) {
    return 0;
  }

  return normalizeDutyCycle((highTimeMs / periodMs) * 100);
}

export function getTriggerModeLabel(triggerMode: TriggerMode | undefined) {
  return TRIGGER_MODE_LABELS[triggerMode ?? DEFAULT_TRIGGER_MODE];
}

export function getTriggerFrequencyLabel(frequencyHz: number | undefined) {
  const normalizedFrequencyHz = normalizeFrequencyHz(
    frequencyHz ?? DEFAULT_TRIGGER_FREQUENCY_HZ,
  );
  return `${normalizedFrequencyHz.toLocaleString(undefined, {
    maximumFractionDigits: 6,
    minimumFractionDigits: normalizedFrequencyHz % 1 === 0 ? 0 : 1,
  })} Hz`;
}
