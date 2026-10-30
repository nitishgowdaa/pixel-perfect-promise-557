import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BarChart3,
  Battery,
  BrainCircuit,
  ChevronsLeft,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Settings,
  Snowflake,
  Sun,
  TriangleAlert,
  Workflow,
  Zap,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_LABELS, useSim, type RangeKey } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/solar", label: "Solar Monitoring", icon: Sun },
  { to: "/geothermal", label: "Geothermal Cooling", icon: Snowflake },
  { to: "/battery", label: "Battery Storage", icon: Battery },
  { to: "/energy-flow", label: "Energy Flow", icon: Workflow },
  { to: "/predictions", label: "AI Predictions", icon: BrainCircuit },
  { to: "/simulation", label: "Simulation", icon: FlaskConical },
  { to: "/analytics", label: "Analytics & Reports", icon: BarChart3 },
  { to: "/alerts", label: "Alerts & Events", icon: TriangleAlert },
  { to: "/settings", label: "System Settings", icon: Settings },
] as const;

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { alerts } = useSim();
  const open = alerts.filter((a) => a.status === "open" && a.severity !== "info").length;
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={n.label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
            {!collapsed && n.to === "/alerts" && open > 0 && (
              <span className="rounded-full bg-discharge px-1.5 text-[10px] font-semibold text-primary-foreground">{open}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
        <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
      </div>
      {!collapsed && (
        <div>
          <div className="text-sm font-semibold text-sidebar-accent-foreground">SolarSync</div>
          <div className="text-[10px] uppercase tracking-wider">Energy Management</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const sim = useSim();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)))?.label ?? "SolarSync";
  const openAlerts = sim.alerts.filter((a) => a.status === "open").length;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <Logo collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <div className="mt-auto border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-2 px-2 text-xs">
              <div className="font-medium text-sidebar-accent-foreground">Guest operator</div>
              <div>Simulation mode · no sign-in</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-sidebar-accent"
            aria-label="Toggle sidebar"
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-64 border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo />
          <NavList onNavigate={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setMobile(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="mr-auto text-base font-semibold">{title}</h2>
          <Select value={sim.campusId} onValueChange={sim.setCampusId}>
            <SelectTrigger className="h-9 w-48" aria-label="Campus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sim.campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.config.campusName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sim.range} onValueChange={(v) => sim.setRange(v as RangeKey)}>
            <SelectTrigger className="h-9 w-36" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {RANGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            aria-label="Simulated day"
            className="h-9 rounded-md border bg-card px-2 text-sm"
            value={sim.date.toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && sim.setDate(new Date(e.target.value + "T00:00:00Z"))}
          />
          <span className="hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs sm:inline-flex">
            <span className={cn("h-2 w-2 rounded-full", sim.playing ? "animate-pulse bg-export" : "bg-import")} />
            Simulation · {sim.current.label}
          </span>
          <Link to="/alerts" className="relative" aria-label="Alerts">
            <Bell className="h-5 w-5" />
            {openAlerts > 0 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {openAlerts}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
