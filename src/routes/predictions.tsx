import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { SCENARIOS, forecast, recommend, type Scenario } from "@/lib/sim/engine";
import { fmt } from "@/lib/format";
import { Card, CardTitle, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { TimeChart, hourly } from "@/components/ss/charts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/predictions")({
  head: pageHead("AI Predictions", "Scenario-based 24-hour and 7-day forecasts of solar, demand, cooling, battery and grid with recommendations."),
  component: Predictions,
});

function Predictions() {
  const { config, date, day, scenario: globalScenario } = useSim();
  const [scenario, setScenario] = useState<Scenario>(globalScenario);
  const [horizon, setHorizon] = useState<"24h" | "7d">("24h");
  const days = horizon === "24h" ? 1 : 7;
  const fc = useMemo(
    () => forecast(config, scenario, new Date(date.getTime() + 86400000), day.intervals.at(-1)!.soc, days),
    [config, scenario, date, day, days],
  );
  const recs = useMemo(() => recommend(config, fc.points.slice(0, 96)), [config, fc]);
  const h = hourly(fc.points, ["pvKw", "pvLow", "pvHigh", "loadKw", "coolKwT", "hpKw", "soc", "importKw", "irradiance"]);
  const shortage = fc.points.filter((p) => p.shortage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Predictions"
        description="Baseline forecasting model: deterministic physical profiles plus scenario weather. No external AI or live weather feed is connected, so all forecasts are scenario-based."
        actions={<SimBadge label="Scenario forecast" />}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={horizon} onValueChange={(v) => setHorizon(v as typeof horizon)}>
          <TabsList>
            <TabsTrigger value="24h">Next 24 hours</TabsTrigger>
            <TabsTrigger value="7d">Next 7 days</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
          <SelectTrigger className="w-48" aria-label="Forecast scenario"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
              <SelectItem key={k} value={k}>{SCENARIOS[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Solar uncertainty band ±{Math.round(fc.uncertainty * 100)} %</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Predicted solar" value={`${fmt(fc.totals.pvKwh)} kWh`} />
        <Stat label="Predicted demand" value={`${fmt(fc.totals.loadKwh)} kWh`} />
        <Stat label="Predicted cooling" value={`${fmt(fc.totals.coolKwhT)} kWh_th`} />
        <Stat label="Geothermal electricity" value={`${fmt(fc.totals.hpKwh + fc.totals.pumpKwh)} kWh`} />
        <Stat label="Predicted grid import" value={`${fmt(fc.totals.importKwh)} kWh`} />
        <Stat label="Shortage intervals" value={`${shortage.length}`} sub={shortage[0] ? `First at ${shortage[0].label}` : "None expected"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle title="Solar generation forecast" subtitle="Predicted with uncertainty band" />
          <TimeChart data={h} unit="kW" series={[{ key: "pvHigh", name: "Upper", color: "var(--solar)", dashed: true }, { key: "pvKw", name: "Predicted", color: "var(--solar)" }, { key: "pvLow", name: "Lower", color: "var(--solar)", dashed: true }]} />
        </Card>
        <Card>
          <CardTitle title="Electrical demand & grid import" />
          <TimeChart data={h} unit="kW" series={[{ key: "loadKw", name: "Demand", color: "var(--load)" }, { key: "importKw", name: "Grid import", color: "var(--import)" }]} />
        </Card>
        <Card>
          <CardTitle title="Cooling demand forecast" />
          <TimeChart data={h} unit="kW" kind="area" series={[{ key: "coolKwT", name: "Cooling (kW_th)", color: "var(--cooling)" }, { key: "hpKw", name: "Heat pump (kW_e)", color: "var(--primary)" }]} />
        </Card>
        <Card>
          <CardTitle title="Expected battery SOC" />
          <TimeChart data={h} unit="%" yDomain={[0, 100]} series={[{ key: "soc", name: "SOC", color: "var(--charge)" }]} />
        </Card>
      </div>
      <Card>
        <CardTitle title="Recommended actions" subtitle="Rule-based on the next 24 h forecast; estimates, not guaranteed savings" />
        <ul className="space-y-3">
          {recs.map((r) => (
            <li key={r.title} className="flex gap-3 rounded-lg border p-3">
              <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${r.priority === "high" ? "text-discharge" : r.priority === "medium" ? "text-solar" : "text-muted-foreground"}`} />
              <div>
                <div className="text-sm font-medium">{r.title} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{r.priority}</span></div>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
