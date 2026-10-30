import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { REF_IRRADIANCE, simulate } from "@/lib/sim/engine";
import { fmt, fmtUnit } from "@/lib/format";
import { Card, CardTitle, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { TimeChart, hourly } from "@/components/ss/charts";
import { NumField } from "@/components/ss/fields";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/solar")({
  head: pageHead("Solar Monitoring", "Simulated PV generation, irradiance, panel temperature and forecasts for the campus array."),
  component: Solar,
});

function Solar() {
  const { day, current: c, config, scenario, date, forecast } = useSim();
  const [period, setPeriod] = useState<"hourly" | "daily" | "monthly">("hourly");
  const month = useMemo(() => {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const days = Math.round((date.getTime() - start.getTime()) / 86400000) + 1;
    return simulate(config, { scenario, date: start, days });
  }, [config, scenario, date]);
  const year = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const r = simulate(config, { scenario, date: new Date(Date.UTC(date.getUTCFullYear(), m, 15)) });
      const dim = new Date(Date.UTC(date.getUTCFullYear(), m + 1, 0)).getUTCDate();
      return { label: new Date(Date.UTC(2000, m, 1)).toLocaleString("en", { month: "short" }), pv: r.totals.pvKwh * dim };
    });
  }, [config, scenario, date]);
  const h = hourly(day.intervals, ["pvKw", "irradiance", "ambient", "panelTemp"]);
  const fcH = hourly(forecast.points, ["pvKw", "pvLow", "pvHigh"]);
  const actVsPred = h.map((r, i) => ({ label: r.label, actual: r.pvKw, predicted: fcH[i]?.pvKw ?? 0 }));
  const cumulative = year.reduce((a, m) => a + m.pv, 0);
  // PR = actual AC energy / (kWp × insolation / ref)
  const insolation = day.intervals.reduce((a, i) => a + i.irradiance, 0) * 0.25;
  const pr = insolation > 0 && config.pvKwp > 0 ? (day.totals.pvKwh / (config.pvKwp * (insolation / REF_IRRADIANCE))) * 100 : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Solar Monitoring" description="Generation from the simulation engine. Configured values are editable below; measured data is not connected." actions={<SimBadge />} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Installed capacity" value={`${fmt(config.pvKwp)} kWp`} sub="Configured" />
        <Stat label={`Power at ${c.label}`} value={`${fmt(c.pvKw, 1)} kW`} />
        <Stat label="Energy today" value={`${fmt(day.totals.pvKwh)} kWh`} />
        <Stat label="This month" value={`${fmt(month.totals.pvKwh)} kWh`} />
        <Stat label="Est. annual (scenario)" value={`${fmt(cumulative / 1000, 1)} MWh`} />
        <Stat label="Irradiance" value={`${fmt(c.irradiance)} W/m²`} />
        <Stat label="Ambient temp." value={`${fmt(c.ambient, 1)} °C`} />
        <Stat label="Panel temp." value={`${fmt(c.panelTemp, 1)} °C`} />
        <Stat label="Performance ratio" value={fmtUnit(pr, "%", 1)} sub="Simulated" />
        <Stat label="Self-consumption" value={fmtUnit(day.totals.selfConsumption, "%", 1)} />
        <Stat label="Forecast tomorrow" value={`${fmt(forecast.totals.pvKwh)} kWh`} sub={`±${Math.round(forecast.uncertainty * 100)} %`} />
        <Stat label="Specific yield" value={config.pvKwp > 0 ? `${fmt(day.totals.pvKwh / config.pvKwp, 2)} kWh/kWp` : "—"} />
      </div>

      <Card>
        <CardTitle
          title="Generation"
          right={
            <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <TabsList>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        {period === "hourly" && <TimeChart data={h} unit="kW" kind="area" series={[{ key: "pvKw", name: "PV power", color: "var(--solar)" }]} />}
        {period === "daily" && (
          <TimeChart data={month.dayTotals.map((d) => ({ label: d.date.toISOString().slice(8, 10), pv: d.pvKwh }))} unit="kWh" kind="bar" series={[{ key: "pv", name: "Daily energy", color: "var(--solar)" }]} />
        )}
        {period === "monthly" && <TimeChart data={year} unit="kWh" kind="bar" series={[{ key: "pv", name: "Monthly energy (scenario)", color: "var(--solar)" }]} />}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle title="Solar irradiance" />
          <TimeChart data={h} unit="W/m²" kind="area" series={[{ key: "irradiance", name: "Irradiance", color: "var(--import)" }]} />
        </Card>
        <Card>
          <CardTitle title="Ambient vs panel temperature" />
          <TimeChart data={h} unit="°C" series={[{ key: "ambient", name: "Ambient", color: "var(--cooling)" }, { key: "panelTemp", name: "Panel", color: "var(--discharge)" }]} />
        </Card>
        <Card>
          <CardTitle title="Today (simulated) vs tomorrow (predicted)" />
          <TimeChart data={actVsPred} unit="kW" series={[{ key: "actual", name: "Simulated today", color: "var(--solar)" }, { key: "predicted", name: "Predicted tomorrow", color: "var(--charge)", dashed: true }]} />
        </Card>
      </div>

      <Card>
        <CardTitle title="PV system configuration" subtitle="User-configured values. Changes re-run the simulation immediately." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumField k="pvKwp" label="Installed capacity" unit="kWp" min={0} max={20000} />
          <NumField k="panelEfficiency" label="Panel efficiency" unit="%" min={5} max={30} step={0.1} help="Informational; output scales with kWp" />
          <NumField k="tilt" label="Panel tilt" unit="°" min={0} max={90} />
          <NumField k="azimuth" label="Azimuth" unit="°" min={0} max={360} />
          <NumField k="inverterEff" label="Inverter efficiency" unit="%" min={50} max={100} step={0.1} />
          <NumField k="systemLosses" label="System losses" unit="%" min={0} max={50} step={0.5} />
          <NumField k="derating" label="Shading / derating" unit="%" min={0} max={90} />
          <NumField k="tempCoef" label="Temp. coefficient" unit="%/°C" min={-1} max={0} step={0.01} />
          <NumField k="lat" label="Latitude" min={-90} max={90} step={0.01} />
          <NumField k="lon" label="Longitude" min={-180} max={180} step={0.01} />
        </div>
      </Card>
    </div>
  );
}
