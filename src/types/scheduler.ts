export type DeviceType = "syringe" | "peristaltic";
export type Direction = "forward" | "reverse";
export type ExperimentState = "idle" | "running";

export interface Row {
  id: string;
  name: string;
  deviceType: DeviceType;
}

export interface Block {
  id: string;
  rowId: string;
  startMs: number;
  durationMs: number;
  direction: Direction;
  flowRate: number;
}

