import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { HardwareAssignmentSelect } from "@/components/hardware-assignment-select";
import { Button } from "@/components/ui/button";
import { DraftNumberInput } from "@/components/ui/draft-number-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getBlockContext } from "@/lib/schedule";
import { MIN_BLOCK_DURATION_MS, getDeviceTypeLabel } from "@/lib/time";
import {
  DEFAULT_TRIGGER_DUTY_CYCLE,
  DEFAULT_TRIGGER_FREQUENCY_HZ,
  DEFAULT_TRIGGER_MODE,
  getDutyCycleFromHighTimeMs,
  getFrequencyHzFromPeriodMs,
  getHighTimeMsFromDutyCycle,
  getPeriodMsFromFrequencyHz,
  getTriggerModeLabel,
  normalizeDutyCycle,
  normalizeFrequencyHz,
} from "@/lib/trigger-output";
import { useSchedulerStore } from "@/store/scheduler-store";
import type { TriggerMode } from "@/types/scheduler";

interface BlockContextMenuProps {
  blockId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function BlockContextMenu({ blockId, x, y, onClose }: BlockContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const blocks = useSchedulerStore((state) => state.blocks);
  const rows = useSchedulerStore((state) => state.rows);
  const gridSizeMs = useSchedulerStore((state) => state.gridSizeMs);
  const updateBlock = useSchedulerStore((state) => state.updateBlock);
  const deleteBlock = useSchedulerStore((state) => state.deleteBlock);

  const blockContext = getBlockContext(rows, blocks, blockId);
  const block = blockContext?.block ?? null;
  const row = blockContext?.row ?? null;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!block || !row) {
    return null;
  }

  const menuLeft =
    typeof window === "undefined" ? x : Math.max(12, Math.min(x, window.innerWidth - 310));
  const menuTop =
    typeof window === "undefined" ? y : Math.max(12, Math.min(y, window.innerHeight - 460));
  const isTriggerBlock = row.deviceType === "trigger";
  const triggerMode = block.triggerMode ?? DEFAULT_TRIGGER_MODE;
  const triggerFrequencyHz = normalizeFrequencyHz(
    block.frequencyHz ?? DEFAULT_TRIGGER_FREQUENCY_HZ,
  );
  const triggerDutyCycle = normalizeDutyCycle(
    block.dutyCycle ?? DEFAULT_TRIGGER_DUTY_CYCLE,
  );
  const triggerPeriodMs = getPeriodMsFromFrequencyHz(triggerFrequencyHz);
  const triggerHighTimeMs = getHighTimeMsFromDutyCycle(
    triggerFrequencyHz,
    triggerDutyCycle,
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[290px] rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.98))] p-4 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.28)] backdrop-blur"
      style={{ left: menuLeft, top: menuTop }}
    >
      <div className="mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Quick Edit
        </div>
        <div className="mt-1 text-sm font-semibold text-foreground">
          {row.name} - {getDeviceTypeLabel(row.deviceType)}
        </div>
      </div>

      <div className="space-y-3">
        <HardwareAssignmentSelect
          id={`menu-hardware-${row.id}`}
          row={row}
          label={row.deviceType === "trigger" ? "Output Pin" : "Pump Index"}
        />

        {isTriggerBlock ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="menu-trigger-mode">Trigger Block Type</Label>
              <Select
                id="menu-trigger-mode"
                value={triggerMode}
                onChange={(event) =>
                  updateBlock(block.id, {
                    triggerMode: event.target.value as TriggerMode,
                  })
                }
              >
                <option value="rising">{getTriggerModeLabel("rising")}</option>
                <option value="falling">{getTriggerModeLabel("falling")}</option>
                <option value="waveform">{getTriggerModeLabel("waveform")}</option>
              </Select>
            </div>

            {triggerMode === "waveform" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="menu-trigger-frequency">Freq (Hz)</Label>
                  <DraftNumberInput
                    id="menu-trigger-frequency"
                    min="0.000001"
                    minValue={Number.EPSILON}
                    step="any"
                    type="number"
                    value={triggerFrequencyHz}
                    onCommit={(value) =>
                      updateBlock(block.id, {
                        frequencyHz: normalizeFrequencyHz(value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-trigger-duty">Duty (%)</Label>
                  <DraftNumberInput
                    id="menu-trigger-duty"
                    min="0"
                    minValue={0}
                    max="100"
                    maxValue={100}
                    step="1"
                    type="number"
                    value={triggerDutyCycle}
                    onCommit={(value) =>
                      updateBlock(block.id, {
                        dutyCycle: normalizeDutyCycle(value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-trigger-period">Period (ms)</Label>
                  <DraftNumberInput
                    id="menu-trigger-period"
                    min="0.0001"
                    minValue={Number.EPSILON}
                    step="any"
                    type="number"
                    value={triggerPeriodMs}
                    onCommit={(value) =>
                      updateBlock(block.id, {
                        frequencyHz: getFrequencyHzFromPeriodMs(value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-trigger-high-time">High Time (ms)</Label>
                  <DraftNumberInput
                    id="menu-trigger-high-time"
                    min="0"
                    minValue={0}
                    step="any"
                    type="number"
                    value={triggerHighTimeMs}
                    onCommit={(value) =>
                      updateBlock(block.id, {
                        dutyCycle: getDutyCycleFromHighTimeMs(
                          triggerFrequencyHz,
                          value,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-direction">Direction</Label>
              <Select
                id="menu-direction"
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
              <Label htmlFor="menu-flow-rate">Flow Rate</Label>
              <div className="relative">
                <DraftNumberInput
                  id="menu-flow-rate"
                  min={0}
                  minValue={0}
                  step="10"
                  type="number"
                  value={block.flowRate}
                  onCommit={(value) =>
                    updateBlock(block.id, {
                      flowRate: value,
                    })
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  uL/min
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-start">Start (ms)</Label>
            <DraftNumberInput
              id="menu-start"
              min={0}
              minValue={0}
              step={gridSizeMs}
              type="number"
              value={block.startMs}
              onCommit={(value) =>
                updateBlock(block.id, {
                  startMs: value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-duration">Duration (ms)</Label>
            <DraftNumberInput
              id="menu-duration"
              min={MIN_BLOCK_DURATION_MS}
              minValue={MIN_BLOCK_DURATION_MS}
              step={gridSizeMs}
              type="number"
              value={block.durationMs}
              onCommit={(value) =>
                updateBlock(block.id, {
                  durationMs: value,
                })
              }
            />
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            deleteBlock(block.id);
            onClose();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
