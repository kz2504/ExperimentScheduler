import { useEffect, useMemo, useState, type RefObject } from "react";
import { RowSidebar } from "@/components/row-sidebar";
import { TimelineRow } from "@/components/timeline-row";
import {
  MIN_BLOCK_DURATION_MS,
  ROW_HEADER_WIDTH,
  TIME_RULER_HEIGHT,
  TIMELINE_ROW_HEIGHT,
} from "@/lib/layout";
import {
  clampBlockStart,
  formatTimelineTime,
  getLabelEvery,
  msToPx,
  pxToMs,
  snapMs,
} from "@/lib/time";
import { clamp } from "@/lib/utils";
import { useSchedulerStore } from "@/store/scheduler-store";
import type { Block, Row } from "@/types/scheduler";

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  blockId: string;
  mode: DragMode;
  originX: number;
  originBlock: Block;
  originRow: Row;
}

interface PanState {
  originX: number;
  originY: number;
  scrollLeft: number;
  scrollTop: number;
}

interface TimelineGridProps {
  totalDurationMs: number;
  scrollRef: RefObject<HTMLDivElement>;
  onOpenBlockContextMenu: (blockId: string, x: number, y: number) => void;
  onDismissContextMenu: () => void;
}

export function TimelineGrid({
  totalDurationMs,
  scrollRef,
  onDismissContextMenu,
  onOpenBlockContextMenu,
}: TimelineGridProps) {
  const rows = useSchedulerStore((state) => state.rows);
  const blocks = useSchedulerStore((state) => state.blocks);
  const gridSizeMs = useSchedulerStore((state) => state.gridSizeMs);
  const zoomPxPerMinute = useSchedulerStore((state) => state.zoomPxPerMinute);
  const playheadMs = useSchedulerStore((state) => state.playheadMs);
  const selectedBlockId = useSchedulerStore((state) => state.selectedBlockId);
  const addBlock = useSchedulerStore((state) => state.addBlock);
  const updateBlock = useSchedulerStore((state) => state.updateBlock);
  const setSelectedBlock = useSchedulerStore((state) => state.setSelectedBlock);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);

  const timelineWidth = Math.max(msToPx(totalDurationMs, zoomPxPerMinute), 1200);
  const labelEvery = getLabelEvery(gridSizeMs, zoomPxPerMinute);
  const tickCount = Math.ceil(totalDurationMs / gridSizeMs) + 1;

  const rowsById = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.id, row])),
    [rows],
  );

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const originType = dragState.originRow.deviceType;
      const rawDeltaMs = pxToMs(event.clientX - dragState.originX, zoomPxPerMinute);

      if (dragState.mode === "move") {
        const nextStartMs = clampBlockStart(
          snapMs(dragState.originBlock.startMs + rawDeltaMs, gridSizeMs),
          dragState.originBlock.durationMs,
          totalDurationMs,
        );

        const container = scrollRef.current;
        let nextRowId = dragState.originBlock.rowId;

        if (container) {
          const rect = container.getBoundingClientRect();
          const offsetY = event.clientY - rect.top + container.scrollTop - TIME_RULER_HEIGHT;
          const rowIndex = Math.floor(offsetY / TIMELINE_ROW_HEIGHT);
          const hoveredRow = rows[rowIndex];

          if (hoveredRow && hoveredRow.deviceType === originType) {
            nextRowId = hoveredRow.id;
          }
        }

        updateBlock(dragState.blockId, {
          rowId: nextRowId,
          startMs: nextStartMs,
        });
        setSelectedBlock(dragState.blockId);
        return;
      }

      if (dragState.mode === "resize-start") {
        const endMs = dragState.originBlock.startMs + dragState.originBlock.durationMs;
        const nextStartMs = clamp(
          snapMs(dragState.originBlock.startMs + rawDeltaMs, gridSizeMs),
          0,
          endMs - Math.max(gridSizeMs, MIN_BLOCK_DURATION_MS),
        );

        updateBlock(dragState.blockId, {
          startMs: nextStartMs,
          durationMs: endMs - nextStartMs,
        });
        setSelectedBlock(dragState.blockId);
        return;
      }

      const nextEndMs = clamp(
        snapMs(
          dragState.originBlock.startMs + dragState.originBlock.durationMs + rawDeltaMs,
          gridSizeMs,
        ),
        dragState.originBlock.startMs + Math.max(gridSizeMs, MIN_BLOCK_DURATION_MS),
        totalDurationMs,
      );

      updateBlock(dragState.blockId, {
        durationMs: nextEndMs - dragState.originBlock.startMs,
      });
      setSelectedBlock(dragState.blockId);
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    dragState,
    gridSizeMs,
    rows,
    rowsById,
    scrollRef,
    setSelectedBlock,
    totalDurationMs,
    updateBlock,
    zoomPxPerMinute,
  ]);

  useEffect(() => {
    if (!panState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = scrollRef.current;
      if (!container) {
        return;
      }

      container.scrollLeft = panState.scrollLeft - (event.clientX - panState.originX);
      container.scrollTop = panState.scrollTop - (event.clientY - panState.originY);
    };

    const handlePointerUp = () => {
      setPanState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panState, scrollRef]);

  return (
    <div className="glass-panel min-h-0 overflow-hidden rounded-[28px] border border-border/70 shadow-panel">
      <div
        ref={scrollRef}
        className={`thin-scrollbar h-full overflow-auto ${panState ? "cursor-grabbing select-none" : ""}`}
        onPointerDown={(event) => {
          onDismissContextMenu();

          if (event.button !== 0 || dragState) {
            return;
          }

          const target = event.target as HTMLElement | null;
          if (!target?.closest("[data-pan-track='true']")) {
            return;
          }

          if (target.closest("[data-block-root='true']")) {
            return;
          }

          const container = scrollRef.current;
          if (!container) {
            return;
          }

          event.preventDefault();
          setPanState({
            originX: event.clientX,
            originY: event.clientY,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop,
          });
        }}
      >
        <div
          className="relative"
          style={{ minWidth: ROW_HEADER_WIDTH + timelineWidth }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 z-40 w-0"
            style={{
              left: ROW_HEADER_WIDTH + clamp(msToPx(playheadMs, zoomPxPerMinute), 0, timelineWidth),
            }}
          >
            <div className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-rose-500 shadow-[0_6px_18px_rgba(244,63,94,0.35)]" />
            <div className="absolute bottom-0 top-0 left-0 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(244,63,94,0.95),rgba(244,63,94,0.38))] shadow-[0_0_12px_rgba(244,63,94,0.3)]" />
          </div>

          <div
            className="sticky top-0 z-30 grid border-b border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,252,0.92))] backdrop-blur"
            style={{
              gridTemplateColumns: `${ROW_HEADER_WIDTH}px ${timelineWidth}px`,
              height: TIME_RULER_HEIGHT,
            }}
          >
            <div className="sticky left-0 z-30 flex items-center border-r border-border/70 px-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Device Channels
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">Timeline Playlist</div>
              </div>
            </div>

            <div
              className={`relative border-l border-border/40 ${panState ? "cursor-grabbing" : "cursor-grab"}`}
              data-pan-track="true"
              style={{
                width: timelineWidth,
              }}
            >
              {Array.from({ length: tickCount }).map((_, index) => {
                const left = msToPx(index * gridSizeMs, zoomPxPerMinute);
                const isMajor = index % labelEvery === 0;
                return (
                  <div
                    key={index}
                    className="absolute inset-y-0"
                    style={{ left }}
                  >
                    <div
                      className={`absolute inset-y-0 w-px ${
                        isMajor ? "bg-slate-300" : "bg-slate-200/80"
                      }`}
                    />
                    {isMajor ? (
                      <div className="absolute left-2 top-2 font-mono text-[11px] text-muted-foreground">
                        {formatTimelineTime(index * gridSizeMs)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map((row, rowIndex) => {
            const rowBlocks = blocks
              .filter((block) => block.rowId === row.id)
              .sort((left, right) => left.startMs - right.startMs);
            return (
              <div
                key={row.id}
                className="grid border-b border-border/50 last:border-b-0"
                style={{
                  gridTemplateColumns: `${ROW_HEADER_WIDTH}px ${timelineWidth}px`,
                  minHeight: TIMELINE_ROW_HEIGHT,
                }}
              >
                <RowSidebar
                  row={row}
                  blockCount={rowBlocks.length}
                  onCreateBlock={() =>
                    addBlock(row.id, snapMs(rowIndex * gridSizeMs * 2, gridSizeMs))
                  }
                />
                <TimelineRow
                  blocks={rowBlocks}
                  gridSizeMs={gridSizeMs}
                  isStriped={rowIndex % 2 === 1}
                  row={row}
                  selectedBlockId={selectedBlockId}
                  timelineWidth={timelineWidth}
                  totalDurationMs={totalDurationMs}
                  zoomPxPerMinute={zoomPxPerMinute}
                  onBlockPointerDown={(blockId, mode, event) => {
                    const block = blocks.find((item) => item.id === blockId);
                    const originRow = rowsById[block?.rowId ?? ""];
                    if (!block || !originRow) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedBlock(blockId);
                    setDragState({
                      blockId,
                      mode,
                      originX: event.clientX,
                      originBlock: block,
                      originRow,
                    });
                  }}
                  onCreateBlock={(timeMs) => {
                    addBlock(row.id, snapMs(timeMs, gridSizeMs));
                  }}
                  onOpenContextMenu={onOpenBlockContextMenu}
                  onSelectBlock={setSelectedBlock}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
