import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  ListTree,
  SlidersHorizontal,
} from "lucide-react";
import { InspectorPanel } from "@/components/inspector-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SidebarView = "inspector" | "devices" | "calibration";

interface SchedulerSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const SIDEBAR_VIEWS: Array<{
  id: SidebarView;
  label: string;
  eyebrow: string;
  description: string;
  Icon: typeof SlidersHorizontal;
}> = [
  {
    id: "inspector",
    label: "Block Inspector",
    eyebrow: "Inspector",
    description: "Inspect and edit the currently selected command block.",
    Icon: SlidersHorizontal,
  },
  {
    id: "devices",
    label: "Device Overview",
    eyebrow: "Devices",
    description: "Reserved for upcoming device inventory and channel summaries.",
    Icon: ListTree,
  },
  {
    id: "calibration",
    label: "Pump Calibration",
    eyebrow: "Calibration",
    description: "Reserved for future syringe and peristaltic pump calibration tools.",
    Icon: FlaskConical,
  },
];

function SidebarPlaceholder({
  title,
  eyebrow,
  description,
}: {
  title: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <Card className="glass-panel min-h-0 overflow-hidden border-border/70">
      <CardContent className="flex h-full min-h-[320px] flex-col gap-4 p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-slate-50/70 px-6 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SchedulerSidebar({
  collapsed,
  onToggleCollapsed,
}: SchedulerSidebarProps) {
  const [activeView, setActiveView] = useState<SidebarView>("inspector");
  const currentView = SIDEBAR_VIEWS.find((view) => view.id === activeView) ?? SIDEBAR_VIEWS[0];

  return (
    <div className="min-h-0">
      <div className={cn("flex h-full gap-3", collapsed ? "justify-end" : "flex-col")}>
        <Card
          className={cn(
            "glass-panel border-border/70",
            collapsed ? "h-full w-[88px] shrink-0" : "overflow-hidden",
          )}
        >
          <CardContent
            className={cn(
              "p-2",
              collapsed ? "flex h-full flex-col items-center gap-2" : "flex flex-wrap gap-2 p-3",
            )}
          >
            <Button
              size="sm"
              variant="outline"
              className={cn(collapsed ? "w-full justify-center" : "shrink-0")}
              onClick={onToggleCollapsed}
            >
              {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {collapsed ? null : "Collapse"}
            </Button>

            {SIDEBAR_VIEWS.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={view.id === activeView ? "default" : "ghost"}
                className={cn(
                  "min-w-0",
                  collapsed ? "w-full justify-center px-0" : "flex-1 justify-start",
                )}
                onClick={() => setActiveView(view.id)}
                title={view.label}
              >
                <view.Icon className="h-4 w-4 shrink-0" />
                {collapsed ? null : <span className="truncate">{view.label}</span>}
              </Button>
            ))}
          </CardContent>
        </Card>

        {collapsed ? null : activeView === "inspector" ? (
          <InspectorPanel />
        ) : (
          <SidebarPlaceholder
            title={currentView.label}
            eyebrow={currentView.eyebrow}
            description={currentView.description}
          />
        )}
      </div>
    </div>
  );
}
