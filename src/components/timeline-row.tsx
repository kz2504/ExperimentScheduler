import type { PointerEvent as ReactPointerEvent } from "react";
import { msToPx, pxToMs } from "@/lib/time";
import { ScheduleBlock } from "@/components/schedule-block";
import type { Block, Row } from "@/types/scheduler";

type DragMode = "move" | "resize-start" | "resize-end";

interface TimelineRowProps {
  row: Row;
  blocks: Block[];
  gridSizeMs: number;
  zoomPxPerMinute: number;
  timelineWidth: number;
  totalDurationMs: number;
  selectedBlockId: string | null;
  isStriped: boolean;
  onSelectBlock: (blockId: string) => void;
  onOpenContextMenu: (blockId: string, x: number, y: number) => void;
  onCreateBlock: (timeMs: number) => void;
  onBlockPointerDown: (
    blockId: string,
    mode: DragMode,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
}

export function TimelineRow({
  row,
  blocks,
  gridSizeMs,
  isStriped,
  onBlockPointerDown,
  onCreateBlock,
  onOpenContextMenu,
  onSelectBlock,
  selectedBlockId,
  timelineWidth,
  totalDurationMs,
  zoomPxPerMinute,
}: TimelineRowProps) {
  const gridPixelSize = msToPx(gridSizeMs, zoomPxPerMinute);

  return (
    <div
      className="relative cursor-grab"
      data-pan-track="true"
      style={{
        width: timelineWidth,
      }}
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-block-root='true']")) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const timeMs = Math.max(0, Math.min(totalDurationMs, pxToMs(offsetX, zoomPxPerMinute)));
        onCreateBlock(timeMs);
      }}
    >
      <div
        className={`timeline-grid absolute inset-0 ${
          isStriped ? "bg-scheduler-lane-alt/80" : "bg-scheduler-lane/80"
        }`}
        style={{
          backgroundSize: `${gridPixelSize}px 100%, ${gridPixelSize}px 100%, 100% 100%`,
        }}
      />
      <div className="absolute inset-y-0 left-0 w-px bg-border/70" />

      {blocks.map((block) => (
        <ScheduleBlock
          key={block.id}
          block={block}
          deviceType={row.deviceType}
          isSelected={selectedBlockId === block.id}
          left={msToPx(block.startMs, zoomPxPerMinute)}
          width={msToPx(block.durationMs, zoomPxPerMinute)}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelectBlock(block.id);
            onOpenContextMenu(block.id, event.clientX, event.clientY);
          }}
          onPointerDownMove={(event) => onBlockPointerDown(block.id, "move", event)}
          onPointerDownResizeStart={(event) =>
            onBlockPointerDown(block.id, "resize-start", event)
          }
          onPointerDownResizeEnd={(event) =>
            onBlockPointerDown(block.id, "resize-end", event)
          }
          onSelect={() => onSelectBlock(block.id)}
        />
      ))}
    </div>
  );
}
