import { useState, type RefObject } from "react";
import { SchedulerSidebar } from "@/components/scheduler-sidebar";
import { TimelineGrid } from "@/components/timeline-grid";
import { cn } from "@/lib/utils";

interface SchedulerLayoutProps {
  totalDurationMs: number;
  scrollRef: RefObject<HTMLDivElement>;
  onOpenBlockContextMenu: (blockId: string, x: number, y: number) => void;
  onDismissContextMenu: () => void;
}

export function SchedulerLayout({
  scrollRef,
  totalDurationMs,
  onOpenBlockContextMenu,
  onDismissContextMenu,
}: SchedulerLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "adaptive-layout grid min-h-0 flex-1 gap-4",
        isSidebarCollapsed
          ? "lg:grid-cols-[minmax(0,1fr),72px]"
          : "lg:grid-cols-[minmax(0,1fr),320px] xl:grid-cols-[minmax(0,1fr),360px]",
      )}
    >
      <TimelineGrid
        scrollRef={scrollRef}
        totalDurationMs={totalDurationMs}
        onDismissContextMenu={onDismissContextMenu}
        onOpenBlockContextMenu={onOpenBlockContextMenu}
      />
      <SchedulerSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
    </div>
  );
}
