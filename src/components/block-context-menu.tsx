import { useEffect, useMemo, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getDeviceTypeLabel } from "@/lib/time";
import { useSchedulerStore } from "@/store/scheduler-store";

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
  const updateBlock = useSchedulerStore((state) => state.updateBlock);
  const deleteBlock = useSchedulerStore((state) => state.deleteBlock);

  const block = blocks.find((item) => item.id === blockId);
  const row = useMemo(() => rows.find((item) => item.id === block?.rowId), [block?.rowId, rows]);

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
    typeof window === "undefined" ? y : Math.max(12, Math.min(y, window.innerHeight - 360));

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
            <Input
              id="menu-flow-rate"
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
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-start">Start (ms)</Label>
            <Input
              id="menu-start"
              min={0}
              step="1000"
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
            <Label htmlFor="menu-duration">Duration (ms)</Label>
            <Input
              id="menu-duration"
              min={1000}
              step="1000"
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
