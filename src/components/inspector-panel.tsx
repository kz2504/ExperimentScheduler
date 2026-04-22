import { Info, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDuration, formatTimelineTime, getDeviceTypeLabel } from "@/lib/time";
import { useSchedulerStore } from "@/store/scheduler-store";

export function InspectorPanel() {
  const rows = useSchedulerStore((state) => state.rows);
  const blocks = useSchedulerStore((state) => state.blocks);
  const selectedBlockId = useSchedulerStore((state) => state.selectedBlockId);
  const updateBlock = useSchedulerStore((state) => state.updateBlock);
  const deleteBlock = useSchedulerStore((state) => state.deleteBlock);
  const gridSizeMs = useSchedulerStore((state) => state.gridSizeMs);

  const block = blocks.find((item) => item.id === selectedBlockId) ?? null;
  const row = rows.find((item) => item.id === block?.rowId) ?? null;
  const compatibleRows = row
    ? rows.filter((candidate) => candidate.deviceType === row.deviceType)
    : [];

  return (
    <Card className="glass-panel min-h-0 overflow-hidden border-border/70">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Inspector
            </div>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Block Configuration</h2>
          </div>
          {row ? (
            <Badge variant={row.deviceType === "syringe" ? "syringe" : "peristaltic"}>
              {row.deviceType}
            </Badge>
          ) : null}
        </div>

        {!block || !row ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-slate-50/70 px-6 text-center">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
              <Info className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Select a block</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Click a command block or right-click it for quick edits. You can fine-tune timing,
              flow, direction, and compatible row assignment here.
            </p>
          </div>
        ) : (
          <div className="thin-scrollbar flex-1 space-y-4 overflow-auto pr-1">
            <div className="rounded-2xl border border-border/60 bg-white/72 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Current Selection
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-lg font-semibold text-foreground">{row.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getDeviceTypeLabel(row.deviceType)} - {formatDuration(block.durationMs)} - starts at{" "}
                  {formatTimelineTime(block.startMs)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="inspector-start">Block Start (ms)</Label>
                <Input
                  id="inspector-start"
                  min={0}
                  step={gridSizeMs}
                  type="number"
                  value={block.startMs}
                  onChange={(event) =>
                    updateBlock(block.id, {
                      startMs: Number(event.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspector-duration">Duration (ms)</Label>
                <Input
                  id="inspector-duration"
                  min={gridSizeMs}
                  step={gridSizeMs}
                  type="number"
                  value={block.durationMs}
                  onChange={(event) =>
                    updateBlock(block.id, {
                      durationMs: Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="inspector-direction">Direction</Label>
                <Select
                  id="inspector-direction"
                  value={block.direction}
                  onChange={(event) =>
                    updateBlock(block.id, {
                      direction: event.target.value as "forward" | "reverse",
                    })
                  }
                >
                  <option value="forward">Forward</option>
                  <option value="reverse">Reverse</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspector-flow-rate">Flow Rate</Label>
                <div className="relative">
                  <Input
                    id="inspector-flow-rate"
                    min={0}
                    step="0.1"
                    type="number"
                    value={block.flowRate}
                    onChange={(event) =>
                      updateBlock(block.id, {
                        flowRate: Number(event.target.value),
                      })
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    mL/min
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector-row">Compatible Row Assignment</Label>
              <Select
                id="inspector-row"
                value={block.rowId}
                onChange={(event) =>
                  updateBlock(block.id, {
                    rowId: event.target.value,
                  })
                }
              >
                {compatibleRows.map((candidateRow) => (
                  <option key={candidateRow.id} value={candidateRow.id}>
                    {candidateRow.name}
                  </option>
                ))}
              </Select>
            </div>

            <Separator />

            <div className="rounded-2xl border border-border/60 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Interaction Notes
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Double-click any empty lane region to create a new block.</li>
                <li>Drag blocks horizontally to shift start time on the grid.</li>
                <li>Use the left and right edges to resize duration precisely.</li>
                <li>Move blocks between rows only when the destination device type matches.</li>
              </ul>
            </div>
          </div>
        )}

        {block ? (
          <div className="flex gap-2 border-t border-border/70 pt-4">
            <Button className="flex-1" variant="secondary">
              Selected: {formatTimelineTime(block.startMs)}
            </Button>
            <Button variant="destructive" onClick={() => deleteBlock(block.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
