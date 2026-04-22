import { create } from "zustand";
import {
  DEFAULT_RUNWAY_DURATION_MS,
  DEFAULT_ZOOM_PX_PER_MINUTE,
  SECOND_MS,
  getBlockEnd,
  getScheduleDuration,
} from "@/lib/time";
import { clamp, createId } from "@/lib/utils";
import type {
  Block,
  DeviceType,
  ExperimentState,
  Row,
} from "@/types/scheduler";

interface SchedulerState {
  rows: Row[];
  blocks: Block[];
  selectedBlockId: string | null;
  gridSizeMs: number;
  zoomPxPerMinute: number;
  runwayDurationMs: number;
  experimentState: ExperimentState;
  playheadMs: number;
  playheadStartOffsetMs: number;
  playheadStartTimestamp: number | null;
  setSelectedBlock: (blockId: string | null) => void;
  setGridSizeMs: (gridSizeMs: number) => void;
  setZoomPxPerMinute: (zoomPxPerMinute: number) => void;
  setRunwayDurationMs: (runwayDurationMs: number) => void;
  startExperiment: () => void;
  stopExperiment: () => void;
  resetExperiment: () => void;
  syncPlayhead: (nowMs?: number) => void;
  addRow: (deviceType?: DeviceType) => void;
  removeRow: (rowId: string) => void;
  updateRow: (rowId: string, patch: Partial<Omit<Row, "id">>) => void;
  addBlock: (rowId: string, startMs: number, durationMs?: number) => void;
  updateBlock: (blockId: string, patch: Partial<Omit<Block, "id">>) => void;
  deleteBlock: (blockId: string) => void;
}

const initialRows: Row[] = [
  { id: "row-a", name: "Pump 1", deviceType: "syringe" },
  { id: "row-b", name: "Pump 2", deviceType: "syringe" },
  { id: "row-c", name: "Pump 3", deviceType: "peristaltic" },
];

const initialBlocks: Block[] = [
  {
    id: "blk-1",
    rowId: "row-a",
    startMs: 1_000,
    durationMs: 2 * SECOND_MS,
    direction: "forward",
    flowRate: 2.5,
  },
  {
    id: "blk-2",
    rowId: "row-b",
    startMs: 4_500,
    durationMs: 2_500,
    direction: "reverse",
    flowRate: 1.2,
  },
  {
    id: "blk-3",
    rowId: "row-c",
    startMs: 9_000,
    durationMs: 4 * SECOND_MS,
    direction: "forward",
    flowRate: 4,
  },
];

function getNextPumpName(rows: Row[]) {
  return `Pump ${rows.length + 1}`;
}

function normalizeFlowRate(flowRate: number) {
  if (Number.isNaN(flowRate) || !Number.isFinite(flowRate)) {
    return 0;
  }

  return Math.max(0, Number(flowRate.toFixed(2)));
}

function normalizeTimeValue(value: number | undefined, fallback: number, minimum: number) {
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.round(value));
}

function getSortedRowBlocks(blocks: Block[], rowId: string, ignoredBlockId?: string) {
  return blocks
    .filter((block) => block.rowId === rowId && block.id !== ignoredBlockId)
    .sort((left, right) =>
      left.startMs === right.startMs
        ? left.id.localeCompare(right.id)
        : left.startMs - right.startMs,
    );
}

function findClosestAvailableStartMs({
  blocks,
  rowId,
  ignoredBlockId,
  desiredStartMs,
  durationMs,
  maxStartMs,
}: {
  blocks: Block[];
  rowId: string;
  ignoredBlockId?: string;
  desiredStartMs: number;
  durationMs: number;
  maxStartMs: number;
}) {
  const clampedMaxStartMs = Math.max(0, maxStartMs);
  const targetStartMs = clamp(desiredStartMs, 0, clampedMaxStartMs);
  const rowBlocks = getSortedRowBlocks(blocks, rowId, ignoredBlockId);
  const availableIntervals: Array<{ startMs: number; endMs: number }> = [];

  let cursorMs = 0;

  for (const rowBlock of rowBlocks) {
    const intervalEndMs = Math.min(clampedMaxStartMs, rowBlock.startMs - durationMs);

    if (cursorMs <= intervalEndMs) {
      availableIntervals.push({ startMs: cursorMs, endMs: intervalEndMs });
    }

    cursorMs = Math.max(cursorMs, getBlockEnd(rowBlock));

    if (cursorMs > clampedMaxStartMs) {
      break;
    }
  }

  if (cursorMs <= clampedMaxStartMs) {
    availableIntervals.push({ startMs: cursorMs, endMs: clampedMaxStartMs });
  }

  if (availableIntervals.length === 0) {
    return targetStartMs;
  }

  let bestStartMs = availableIntervals[0].startMs;
  let bestDistance = Math.abs(bestStartMs - targetStartMs);

  for (const interval of availableIntervals) {
    const candidateStartMs = clamp(targetStartMs, interval.startMs, interval.endMs);
    const candidateDistance = Math.abs(candidateStartMs - targetStartMs);

    if (
      candidateDistance < bestDistance ||
      (candidateDistance === bestDistance && candidateStartMs < bestStartMs)
    ) {
      bestStartMs = candidateStartMs;
      bestDistance = candidateDistance;
    }
  }

  return bestStartMs;
}

function getPreviousBlockEndMs(
  blocks: Block[],
  rowId: string,
  ignoredBlockId: string,
  endMs: number,
) {
  const rowBlocks = getSortedRowBlocks(blocks, rowId, ignoredBlockId).filter(
    (block) => block.startMs < endMs,
  );
  const previousBlock = rowBlocks[rowBlocks.length - 1];
  return previousBlock ? getBlockEnd(previousBlock) : 0;
}

function getNextBlockStartMs(
  blocks: Block[],
  rowId: string,
  ignoredBlockId: string,
  startMs: number,
) {
  const nextBlock = getSortedRowBlocks(blocks, rowId, ignoredBlockId).find(
    (block) => block.startMs >= startMs,
  );
  return nextBlock?.startMs ?? null;
}

function clampDurationWithinRow({
  blocks,
  rowId,
  ignoredBlockId,
  startMs,
  desiredDurationMs,
  minimumDurationMs,
}: {
  blocks: Block[];
  rowId: string;
  ignoredBlockId: string;
  startMs: number;
  desiredDurationMs: number;
  minimumDurationMs: number;
}) {
  const nextBlockStartMs = getNextBlockStartMs(blocks, rowId, ignoredBlockId, startMs);

  if (nextBlockStartMs === null) {
    return desiredDurationMs;
  }

  return Math.max(minimumDurationMs, Math.min(desiredDurationMs, nextBlockStartMs - startMs));
}

function getCurrentPlayheadMs(
  state: Pick<
    SchedulerState,
    "playheadMs" | "playheadStartOffsetMs" | "playheadStartTimestamp" | "runwayDurationMs"
  >,
  nowMs = Date.now(),
) {
  if (state.playheadStartTimestamp === null) {
    return clamp(state.playheadMs, 0, state.runwayDurationMs);
  }

  return clamp(
    state.playheadStartOffsetMs + (nowMs - state.playheadStartTimestamp),
    0,
    state.runwayDurationMs,
  );
}

function getPlayheadSnapshot(
  state: Pick<
    SchedulerState,
    | "experimentState"
    | "playheadMs"
    | "playheadStartOffsetMs"
    | "playheadStartTimestamp"
    | "runwayDurationMs"
  >,
  nextRunwayDurationMs = state.runwayDurationMs,
  nowMs = Date.now(),
): Pick<
  SchedulerState,
  "experimentState" | "playheadMs" | "playheadStartOffsetMs" | "playheadStartTimestamp"
> {
  const nextPlayheadMs = clamp(getCurrentPlayheadMs(state, nowMs), 0, nextRunwayDurationMs);
  const shouldKeepRunning =
    state.experimentState === "running" && nextPlayheadMs < nextRunwayDurationMs;

  return {
    experimentState: shouldKeepRunning ? "running" : "idle",
    playheadMs: nextPlayheadMs,
    playheadStartOffsetMs: nextPlayheadMs,
    playheadStartTimestamp: shouldKeepRunning ? nowMs : null,
  };
}

const initialRunwayDurationMs = getScheduleDuration(initialBlocks, DEFAULT_RUNWAY_DURATION_MS);

export const useSchedulerStore = create<SchedulerState>((set) => ({
  rows: initialRows,
  blocks: initialBlocks,
  selectedBlockId: initialBlocks[0]?.id ?? null,
  gridSizeMs: 500,
  zoomPxPerMinute: DEFAULT_ZOOM_PX_PER_MINUTE,
  runwayDurationMs: initialRunwayDurationMs,
  experimentState: "idle",
  playheadMs: 0,
  playheadStartOffsetMs: 0,
  playheadStartTimestamp: null,
  setSelectedBlock: (selectedBlockId) => set({ selectedBlockId }),
  setGridSizeMs: (gridSizeMs) => set({ gridSizeMs }),
  setZoomPxPerMinute: (zoomPxPerMinute) => set({ zoomPxPerMinute }),
  setRunwayDurationMs: (runwayDurationMs) =>
    set((state) => {
      const nowMs = Date.now();
      const nextRunwayDurationMs = getScheduleDuration(state.blocks, runwayDurationMs);

      return {
        runwayDurationMs: nextRunwayDurationMs,
        ...getPlayheadSnapshot(state, nextRunwayDurationMs, nowMs),
      };
    }),
  startExperiment: () =>
    set((state) => {
      if (state.experimentState === "running") {
        return state;
      }

      const nowMs = Date.now();
      const nextPlayheadMs =
        state.playheadMs >= state.runwayDurationMs
          ? 0
          : clamp(state.playheadMs, 0, state.runwayDurationMs);

      return {
        experimentState: "running",
        playheadMs: nextPlayheadMs,
        playheadStartOffsetMs: nextPlayheadMs,
        playheadStartTimestamp: nowMs,
      };
    }),
  stopExperiment: () =>
    set((state) => {
      if (state.experimentState !== "running") {
        return state;
      }

      const nextPlayheadMs = getCurrentPlayheadMs(state);
      return {
        experimentState: "idle",
        playheadMs: nextPlayheadMs,
        playheadStartOffsetMs: nextPlayheadMs,
        playheadStartTimestamp: null,
      };
    }),
  resetExperiment: () =>
    set({
      experimentState: "idle",
      playheadMs: 0,
      playheadStartOffsetMs: 0,
      playheadStartTimestamp: null,
    }),
  syncPlayhead: (nowMs = Date.now()) =>
    set((state) => {
      if (state.experimentState !== "running") {
        return state;
      }

      const nextPlayheadMs = getCurrentPlayheadMs(state, nowMs);

      if (nextPlayheadMs >= state.runwayDurationMs) {
        return {
          experimentState: "idle",
          playheadMs: state.runwayDurationMs,
          playheadStartOffsetMs: state.runwayDurationMs,
          playheadStartTimestamp: null,
        };
      }

      if (nextPlayheadMs === state.playheadMs) {
        return state;
      }

      return {
        playheadMs: nextPlayheadMs,
      };
    }),
  addRow: (deviceType = "syringe") =>
    set((state) => ({
      rows: [
        ...state.rows,
        {
          id: createId("row"),
          name: getNextPumpName(state.rows),
          deviceType,
        },
      ],
    })),
  removeRow: (rowId) =>
    set((state) => {
      const remainingRows = state.rows.filter((row) => row.id !== rowId);

      if (remainingRows.length === 0) {
        return state;
      }

      const remainingBlocks = state.blocks.filter((block) => block.rowId !== rowId);
      const nextSelected = remainingBlocks.some((block) => block.id === state.selectedBlockId)
        ? state.selectedBlockId
        : remainingBlocks[0]?.id ?? null;
      const nextRunwayDurationMs = getScheduleDuration(remainingBlocks, state.runwayDurationMs);
      const nowMs = Date.now();

      return {
        rows: remainingRows,
        blocks: remainingBlocks,
        selectedBlockId: nextSelected,
        runwayDurationMs: nextRunwayDurationMs,
        ...getPlayheadSnapshot(state, nextRunwayDurationMs, nowMs),
      };
    }),
  updateRow: (rowId, patch) =>
    set((state) => ({
      rows: state.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    })),
  addBlock: (rowId, startMs, durationMs = 2 * SECOND_MS) =>
    set((state) => {
      const rowBlocks = getSortedRowBlocks(state.blocks, rowId);
      const lastBlock = rowBlocks[rowBlocks.length - 1];
      const newBlock: Block = {
        id: createId("block"),
        rowId,
        startMs: lastBlock ? getBlockEnd(lastBlock) : Math.max(0, startMs),
        durationMs: Math.max(state.gridSizeMs, durationMs),
        direction: "forward",
        flowRate: 1,
      };
      const nextBlocks = [...state.blocks, newBlock];
      const nextRunwayDurationMs = getScheduleDuration(nextBlocks, state.runwayDurationMs);
      const nowMs = Date.now();

      return {
        blocks: nextBlocks,
        selectedBlockId: newBlock.id,
        runwayDurationMs: nextRunwayDurationMs,
        ...getPlayheadSnapshot(state, nextRunwayDurationMs, nowMs),
      };
    }),
  updateBlock: (blockId, patch) =>
    set((state) => {
      const nextBlocks = state.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        const requestedRowId =
          patch.rowId !== undefined && state.rows.some((row) => row.id === patch.rowId)
            ? patch.rowId
            : block.rowId;
        const requestedStartMs = normalizeTimeValue(patch.startMs, block.startMs, 0);
        const requestedDurationMs = normalizeTimeValue(
          patch.durationMs,
          block.durationMs,
          state.gridSizeMs,
        );
        const rowChanged = requestedRowId !== block.rowId;
        const startChanged = patch.startMs !== undefined;
        const durationChanged = patch.durationMs !== undefined;
        const maxStartMs = Math.max(
          0,
          requestedStartMs,
          state.runwayDurationMs - requestedDurationMs,
        );

        let nextStartMs = block.startMs;
        let nextDurationMs = block.durationMs;

        if (startChanged && durationChanged && !rowChanged) {
          const blockEndMs = getBlockEnd(block);
          const previousEndMs = getPreviousBlockEndMs(
            state.blocks,
            requestedRowId,
            block.id,
            blockEndMs,
          );

          nextStartMs = clamp(
            requestedStartMs,
            previousEndMs,
            blockEndMs - state.gridSizeMs,
          );
          nextDurationMs = blockEndMs - nextStartMs;
        } else if (durationChanged && !startChanged && !rowChanged) {
          nextStartMs = block.startMs;
          nextDurationMs = clampDurationWithinRow({
            blocks: state.blocks,
            rowId: requestedRowId,
            ignoredBlockId: block.id,
            startMs: nextStartMs,
            desiredDurationMs: requestedDurationMs,
            minimumDurationMs: state.gridSizeMs,
          });
        } else {
          nextDurationMs = requestedDurationMs;
          nextStartMs = findClosestAvailableStartMs({
            blocks: state.blocks,
            rowId: requestedRowId,
            ignoredBlockId: block.id,
            desiredStartMs: requestedStartMs,
            durationMs: nextDurationMs,
            maxStartMs,
          });
        }

        return {
          ...block,
          ...patch,
          rowId: requestedRowId,
          startMs: nextStartMs,
          durationMs: nextDurationMs,
          flowRate:
            patch.flowRate === undefined
              ? block.flowRate
              : normalizeFlowRate(patch.flowRate),
        };
      });
      const nextRunwayDurationMs = getScheduleDuration(nextBlocks, state.runwayDurationMs);
      const nowMs = Date.now();

      return {
        blocks: nextBlocks,
        runwayDurationMs: nextRunwayDurationMs,
        ...getPlayheadSnapshot(state, nextRunwayDurationMs, nowMs),
      };
    }),
  deleteBlock: (blockId) =>
    set((state) => {
      const remainingBlocks = state.blocks.filter((block) => block.id !== blockId);
      const nextRunwayDurationMs = getScheduleDuration(remainingBlocks, state.runwayDurationMs);
      const nowMs = Date.now();
      return {
        blocks: remainingBlocks,
        runwayDurationMs: nextRunwayDurationMs,
        selectedBlockId:
          state.selectedBlockId === blockId ? remainingBlocks[0]?.id ?? null : state.selectedBlockId,
        ...getPlayheadSnapshot(state, nextRunwayDurationMs, nowMs),
      };
    }),
}));
