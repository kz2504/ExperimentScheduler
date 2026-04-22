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
  Icon: typeof SlidersHorizontal;
}> = [
  {
    id: "inspector",
    label: "Block Inspector",
    eyebrow: "Inspector",
    Icon: SlidersHorizontal,
  },
  {
    id: "devices",
    label: "Device Overview",
    eyebrow: "Devices",
    Icon: ListTree,
  },
  {
    id: "calibration",
    label: "Pump Calibration",
    eyebrow: "Calibration",
    Icon: FlaskConical,
  },
];

function SidebarPlaceholder({
  title,
  eyebrow,
  Icon,
}: {
  title: string;
  eyebrow: string;
  Icon: typeof SlidersHorizontal;
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
          <div className="rounded-3xl border border-border/60 bg-white/80 p-5 text-slate-400 shadow-sm">
            <Icon className="h-10 w-10" />
          </div>
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
      <div
        className={cn(
          "h-full min-h-0",
          collapsed ? "flex justify-end" : "grid grid-rows-[auto,minmax(0,1fr)] gap-2",
        )}
      >
        <Card
          className={cn(
            "glass-panel shrink-0 border-border/70",
            collapsed ? "h-full w-[72px] shrink-0" : "overflow-hidden",
          )}
        >
          <CardContent
            className={cn(
              "p-1.5",
              collapsed
                ? "flex h-full flex-col items-center gap-1.5"
                : "flex min-h-[48px] items-center justify-center gap-1.5 p-1.5",
            )}
          >
            <Button
              size="sm"
              variant="outline"
              className={cn("h-8 w-8 shrink-0 px-0", collapsed && "w-full")}
              onClick={onToggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {SIDEBAR_VIEWS.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={view.id === activeView ? "default" : "ghost"}
                className={cn("h-8 shrink-0 px-0", collapsed ? "w-full justify-center" : "w-8")}
                onClick={() => setActiveView(view.id)}
                title={view.label}
              >
                <view.Icon className="h-4 w-4 shrink-0" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {collapsed ? null : (
          <div className="min-h-0">
            {activeView === "inspector" ? (
              <InspectorPanel />
            ) : (
              <SidebarPlaceholder
                title={currentView.label}
                eyebrow={currentView.eyebrow}
                Icon={currentView.Icon}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
