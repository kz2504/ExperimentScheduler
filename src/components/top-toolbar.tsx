import {
  Activity,
  Gauge,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { OverviewMinimap } from "@/components/overview-minimap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  GRID_OPTIONS,
  ZOOM_LEVELS,
  formatDuration,
  formatTimelineTime,
} from "@/lib/time";
import { useSchedulerStore } from "@/store/scheduler-store";

interface TopToolbarProps {
  totalDurationMs: number;
  viewportStartMs: number;
  viewportDurationMs: number;
  onJumpToTime: (timeMs: number) => void;
}

export function TopToolbar({
  totalDurationMs,
  viewportDurationMs,
  viewportStartMs,
  onJumpToTime,
}: TopToolbarProps) {
  const rows = useSchedulerStore((state) => state.rows);
  const blocks = useSchedulerStore((state) => state.blocks);
  const gridSizeMs = useSchedulerStore((state) => state.gridSizeMs);
  const zoomPxPerMinute = useSchedulerStore((state) => state.zoomPxPerMinute);
  const experimentState = useSchedulerStore((state) => state.experimentState);
  const playheadMs = useSchedulerStore((state) => state.playheadMs);
  const addRow = useSchedulerStore((state) => state.addRow);
  const startExperiment = useSchedulerStore((state) => state.startExperiment);
  const stopExperiment = useSchedulerStore((state) => state.stopExperiment);
  const resetExperiment = useSchedulerStore((state) => state.resetExperiment);
  const setGridSizeMs = useSchedulerStore((state) => state.setGridSizeMs);
  const setRunwayDurationMs = useSchedulerStore((state) => state.setRunwayDurationMs);
  const setZoomPxPerMinute = useSchedulerStore((state) => state.setZoomPxPerMinute);

  const zoomIndex = ZOOM_LEVELS.indexOf(zoomPxPerMinute as (typeof ZOOM_LEVELS)[number]);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex >= 0 && zoomIndex < ZOOM_LEVELS.length - 1;
  const panelClassName = "toolbar-panel min-w-0 rounded-2xl border border-border/60 bg-white/72 p-3";
  const zoomPxPerSecond = zoomPxPerMinute / 60;
  const zoomLabel = `${Number.isInteger(zoomPxPerSecond) ? zoomPxPerSecond : zoomPxPerSecond.toFixed(1)} px/s`;

  return (
    <Card className="adaptive-toolbar glass-panel mb-4 overflow-hidden border-border/70 shadow-panel">
      <CardContent className="toolbar-content space-y-4 p-4">
        <div className="toolbar-header flex flex-wrap items-start justify-between gap-4">
          <div className="toolbar-copy min-w-0 space-y-2">
            <div className="toolbar-title-row flex items-center gap-3">
              <div className="toolbar-mark rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="toolbar-kicker text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700/80">
                  Pump Control Scheduler
                </div>
                <h1 className="toolbar-title truncate text-2xl font-semibold tracking-tight text-foreground">
                  NectowLab Experiment Scheduler
                </h1>
              </div>
            </div>
            <p className="toolbar-description max-w-2xl text-sm text-muted-foreground">
              Arrange long-running pump commands on a time grid, tune them in the inspector,
              and navigate the full experiment from a compact overview strip.
            </p>
          </div>

          <div className="toolbar-badges flex flex-wrap items-center gap-2">
            <Badge variant={experimentState === "running" ? "success" : "default"}>
              {experimentState === "running" ? "Experiment Running" : "Experiment Idle"}
            </Badge>
            <Badge variant="default">Playhead {formatTimelineTime(playheadMs)}</Badge>
            <Badge variant="default">{rows.length} channels</Badge>
            <Badge variant="default">{blocks.length} commands</Badge>
          </div>
        </div>

        <div className="toolbar-deck grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          <div className={panelClassName}>
            <Label htmlFor="grid-size">Grid Increment</Label>
            <Select
              id="grid-size"
              value={String(gridSizeMs)}
              onChange={(event) => setGridSizeMs(Number(event.target.value))}
            >
              {GRID_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className={panelClassName}>
            <Label>Experiment Control</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-w-[88px] flex-1"
                size="sm"
                disabled={experimentState === "running"}
                onClick={startExperiment}
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
              <Button
                className="min-w-[88px] flex-1"
                size="sm"
                variant="secondary"
                disabled={experimentState === "idle"}
                onClick={stopExperiment}
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <Button
                className="min-w-[88px] flex-1"
                size="sm"
                variant="outline"
                onClick={resetExperiment}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          <div className={panelClassName}>
            <Label>Zoom</Label>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Button
                disabled={!canZoomOut}
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  if (canZoomOut) {
                    setZoomPxPerMinute(ZOOM_LEVELS[zoomIndex - 1]);
                  }
                }}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-slate-50/85 px-3 py-2 text-center text-xs text-foreground sm:text-sm">
                <div className="truncate font-medium">{zoomLabel}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {zoomPxPerMinute}px/min
                </div>
              </div>
              <Button
                disabled={!canZoomIn}
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  if (canZoomIn) {
                    setZoomPxPerMinute(ZOOM_LEVELS[zoomIndex + 1]);
                  }
                }}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={panelClassName}>
            <Label>View Window</Label>
            <div className="rounded-xl border border-border/60 bg-slate-50/85 px-3 py-2 text-sm text-foreground">
              {formatTimelineTime(viewportStartMs)} to{" "}
              {formatTimelineTime(viewportStartMs + viewportDurationMs)}
            </div>
          </div>

          <div className={panelClassName}>
            <Label>Total Runway</Label>
            <div className="relative">
              <Input
                min={gridSizeMs}
                step={gridSizeMs}
                type="number"
                value={totalDurationMs}
                onChange={(event) => setRunwayDurationMs(Number(event.target.value))}
              />
              <Gauge className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600" />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(totalDurationMs)} total. Runway grows automatically if a block
              extends past it.
            </div>
          </div>

          <div className={`${panelClassName} toolbar-panel--wide xl:col-span-2`}>
            <div className="flex items-center justify-between gap-3">
              <Label>Schedule Overview</Label>
              <div className="toolbar-overview-hint flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Click to jump
              </div>
            </div>
            <OverviewMinimap
              blocks={blocks}
              rows={rows}
              totalDurationMs={totalDurationMs}
              viewportDurationMs={viewportDurationMs}
              viewportStartMs={viewportStartMs}
              onJumpToTime={onJumpToTime}
            />
          </div>

          <div className={`${panelClassName} toolbar-panel--narrow flex min-w-0 flex-col gap-3`}>
            <Label>Rows</Label>
            <Button size="sm" className="justify-start" onClick={() => addRow("syringe")}>
              <Plus className="h-4 w-4" />
              Add Channel
            </Button>
            <div className="text-xs text-muted-foreground">
              New rows start as syringe channels and can be switched at any time.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
