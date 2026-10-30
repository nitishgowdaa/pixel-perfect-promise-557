import type { ReactNode } from "react";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>{children}</div>;
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SimBadge({ label = "Simulated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-charge" />
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  invert,
  hint,
  spark,
  color = "var(--solar)",
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number | null;
  invert?: boolean;
  hint: string;
  spark?: number[];
  color?: string;
  icon?: ReactNode;
}) {
  const good = delta == null ? null : invert ? delta < 0 : delta > 0;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
          <Tooltip>
            <TooltipTrigger aria-label={`About ${label}`}>
              <Info className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-60">{hint}</TooltipContent>
          </Tooltip>
        </div>
        <SimBadge />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            good == null ? "text-muted-foreground" : good ? "text-success" : "text-discharge",
          )}
        >
          {delta == null ? <Minus className="h-3 w-3" /> : delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta == null ? "No comparison" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} % vs prev. day`}
        </span>
        {spark && (
          <div className="h-8 w-20">
            <ResponsiveContainer>
              <AreaChart data={spark.map((v, i) => ({ i, v }))}>
                <Area dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular mt-1 font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
