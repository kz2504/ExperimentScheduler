import { cn } from "@/lib/utils";
import { useSchedulerStore } from "@/store/scheduler-store";
import type { Block, Row } from "@/types/scheduler";

interface OverviewMinimapProps {
  rows: Row[];
  blocks: Block[];
  totalDurationMs: number;
  viewportStartMs: number;
  viewportDurationMs: number;
  onJumpToTime: (timeMs: number) => void;
}

export function OverviewMinimap({
  rows,
  blocks,
  totalDurationMs,
  viewportDurationMs,
  viewportStartMs,
  onJumpToTime,
}: OverviewMinimapProps) {
  const playheadMs = useSchedulerStore((state) => state.playheadMs);
  const rowHeight = 16;
  const viewportWidthPercent = Math.max(8, (viewportDurationMs / totalDurationMs) * 100);
  const viewportLeftPercent = Math.min(
    100 - viewportWidthPercent,
    (viewportStartMs / totalDurationMs) * 100,
  );

  return (
    <div className="space-y-2">
      <button
        className="relative block w-full overflow-hidden rounded-2xl border border-border/60 bg-slate-50/90 p-2 text-left"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          onJumpToTime(totalDurationMs * ratio - viewportDurationMs / 2);
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.06),transparent_25%,transparent_75%,rgba(148,163,184,0.06))]" />
        <div className="relative">
          {rows.map((row) => (
            <div
              key={row.id}
              className="relative mb-1 overflow-hidden rounded-md bg-white/80"
              style={{ height: rowHeight }}
            >
              {blocks
                .filter((block) => block.rowId === row.id)
                .map((block) => {
                  const left = (block.startMs / totalDurationMs) * 100;
                  const width = Math.max(1.5, (block.durationMs / totalDurationMs) * 100);
                  return (
                    <div
                      key={block.id}
                      className={cn(
                        "absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full",
                        row.deviceType === "syringe"
                          ? "bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                          : "bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.18)]",
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-2 rounded-xl border border-cyan-400/60 bg-cyan-400/12 shadow-[0_0_0_1px_rgba(34,211,238,0.14)]"
          style={{
            left: `${viewportLeftPercent}%`,
            width: `${viewportWidthPercent}%`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-2 w-px bg-rose-500/85 shadow-[0_0_10px_rgba(244,63,94,0.32)]"
          style={{
            left: `${Math.min(100, (playheadMs / totalDurationMs) * 100)}%`,
          }}
        />
      </button>

      <div className="flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>0:00</span>
        <span>{Math.round(totalDurationMs / 60_000)} min</span>
      </div>
    </div>
  );
}
