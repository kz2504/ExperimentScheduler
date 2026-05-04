import { getBlockEnd } from "@/lib/time";
import type { Block, Row } from "@/types/scheduler";

export interface BlockContext {
  block: Block;
  row: Row;
  compatibleRows: Row[];
}

export function compareBlocksByTime(left: Block, right: Block) {
  return left.startMs === right.startMs
    ? left.id.localeCompare(right.id)
    : left.startMs - right.startMs;
}

export function getSortedRowBlocks(
  blocks: Block[],
  rowId: string,
  ignoredBlockId?: string,
) {
  return blocks
    .filter((block) => block.rowId === rowId && block.id !== ignoredBlockId)
    .sort(compareBlocksByTime);
}

export function getRowsById(rows: Row[]): Record<string, Row> {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

export function getBlockById(blocks: Block[], blockId: string | null) {
  return blockId ? blocks.find((block) => block.id === blockId) ?? null : null;
}

export function getRowById(rows: Row[], rowId: string | null | undefined) {
  return rowId ? rows.find((row) => row.id === rowId) ?? null : null;
}

export function getCompatibleRows(rows: Row[], row: Row | null) {
  return row
    ? rows.filter(
        (candidate) =>
          candidate.deviceType === row.deviceType && !candidate.isScheduleStatus,
      )
    : [];
}

export function getBlockContext(
  rows: Row[],
  blocks: Block[],
  blockId: string | null,
): BlockContext | null {
  const block = getBlockById(blocks, blockId);
  const row = getRowById(rows, block?.rowId);

  if (!block || !row) {
    return null;
  }

  return {
    block,
    row,
    compatibleRows: getCompatibleRows(rows, row),
  };
}

export function getPreviousBlockEndMs(
  blocks: Block[],
  rowId: string,
  ignoredBlockId: string,
  endMs: number,
) {
  const previousBlocks = getSortedRowBlocks(blocks, rowId, ignoredBlockId).filter(
    (block) => block.startMs < endMs,
  );
  const previousBlock = previousBlocks[previousBlocks.length - 1];
  return previousBlock ? getBlockEnd(previousBlock) : 0;
}

export function getNextBlockStartMs(
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
