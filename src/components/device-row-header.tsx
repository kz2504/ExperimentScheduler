import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getDeviceTypeLabel } from "@/lib/time";
import { useSchedulerStore } from "@/store/scheduler-store";
import type { DeviceType, Row } from "@/types/scheduler";

interface DeviceRowHeaderProps {
  row: Row;
  blockCount: number;
  onCreateBlock: () => void;
}

export function DeviceRowHeader({
  row,
  blockCount,
  onCreateBlock,
}: DeviceRowHeaderProps) {
  const rows = useSchedulerStore((state) => state.rows);
  const updateRow = useSchedulerStore((state) => state.updateRow);
  const removeRow = useSchedulerStore((state) => state.removeRow);

  return (
    <div className="flex w-full flex-col justify-between px-4 py-3">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-wide text-foreground">{row.name}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {blockCount} command{blockCount === 1 ? "" : "s"}
            </div>
          </div>
          <div
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
              row.deviceType === "syringe"
                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                : "border-orange-200 bg-orange-50 text-orange-700"
            }`}
          >
            {row.deviceType}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Device
          </div>
          <Select
            value={row.deviceType}
            onChange={(event) =>
              updateRow(row.id, {
                deviceType: event.target.value as DeviceType,
              })
            }
          >
            <option value="syringe">{getDeviceTypeLabel("syringe")}</option>
            <option value="peristaltic">{getDeviceTypeLabel("peristaltic")}</option>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" onClick={onCreateBlock}>
          <Plus className="h-4 w-4" />
          Add Block
        </Button>
        <Button
          disabled={rows.length <= 1}
          size="sm"
          variant="outline"
          onClick={() => removeRow(row.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
