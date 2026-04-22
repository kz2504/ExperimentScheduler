import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Block, DeviceType } from "@/types/scheduler";
import { formatDuration, getDeviceTypeLabel, getFlowRateLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

interface ScheduleBlockProps {
  block: Block;
  deviceType: DeviceType;
  left: number;
  width: number;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onPointerDownMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDownResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDownResizeEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function ScheduleBlock({
  block,
  deviceType,
  isSelected,
  left,
  onContextMenu,
  onPointerDownMove,
  onPointerDownResizeEnd,
  onPointerDownResizeStart,
  onSelect,
  width,
}: ScheduleBlockProps) {
  const isSyringe = deviceType === "syringe";

  return (
    <div
      data-block-root="true"
      className={cn(
        "absolute top-2 flex h-[76px] select-none flex-col justify-between overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-[0_16px_32px_-22px_rgba(15,23,42,0.28)] transition-all",
        isSyringe
          ? "border-cyan-200 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(186,230,253,0.94))] text-slate-800"
          : "border-orange-200 bg-[linear-gradient(180deg,rgba(255,247,237,0.98),rgba(254,215,170,0.92))] text-slate-800",
        isSelected && "ring-2 ring-primary/45 ring-offset-2 ring-offset-white",
      )}
      style={{
        left,
        width: Math.max(width, 48),
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDownMove}
      role="button"
      tabIndex={0}
    >
      <div
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/0 transition hover:bg-slate-900/6"
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDownResizeStart(event);
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/0 transition hover:bg-slate-900/6"
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDownResizeEnd(event);
        }}
      />

      <div className="pointer-events-none flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {getDeviceTypeLabel(deviceType)}
          </div>
          <div className="mt-1 truncate text-sm font-semibold">
            {block.direction === "forward" ? "Forward" : "Reverse"}
          </div>
        </div>
      </div>

      <div className="pointer-events-none flex items-center justify-between gap-3 text-xs">
        <div className="truncate rounded-full border border-white/60 bg-white/72 px-2.5 py-1 font-medium text-slate-700">
          {getFlowRateLabel(block.flowRate)}
        </div>
        <div className="truncate font-mono text-slate-500">
          {formatDuration(block.durationMs)}
        </div>
      </div>
    </div>
  );
}
