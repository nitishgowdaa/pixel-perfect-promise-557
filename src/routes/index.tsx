import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Battery, Gauge, IndianRupee, Snowflake, Sun, UtilityPole, Zap } from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { pctChange } from "@/lib/sim/engine";
import { fmt } from "@/lib/format";
import { Card, CardTitle, KpiCard, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { FlowDiagram } from "@/components/ss/FlowDiagram";
import { SimControls } from "@/components/ss/SimControls";
import { TimeChart, hourly } from "@/components/ss/charts";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/")({
  head: pageHead("Overview", "Live simulated energy status of the campus: solar, demand, battery, geothermal cooling and grid."),
  component: Overview,
});

function Overview() {
  const { day, prevDay, current: c, config, rangeSim, range } = useSim();
  const t = day.totals;
  const p = prevDay.totals;
  const h = hourly(day.intervals, ["pvKw", "loadKw", "soc", "importKw", "exportKw", "coolKwT"]);
  const spark = (k: string) => h.map((r) => r[k] as number);
  const balance = c.pvKw - c.loadKw;

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.campusName}
        description={`${config.locationName}. All values are produced by the SolarSync simulator — no hardware is connected.`}
      />
      <SimControls />
      {day.issues.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div>{day.issues.join(" ")}</div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Sun className="h-3.5 w-3.5" />} label="Solar energy today" value={fmt(t.pvKwh)} unit="kWh" delta={pctChange(p.pvKwh, t.pvKwh)} hint="Total PV electrical energy generated over the simulated day." spark={spark("pvKw")} />
        <KpiCard icon={<Zap className="h-3.5 w-3.5" />} label="Campus consumption" value={fmt(t.loadKwh)} unit="kWh" invert delta={pctChange(p.loadKwh, t.loadKwh)} hint="Electrical demand including heat-pump and circulation pumps; excludes battery charging." spark={spark("loadKw")} color="var(--load)" />
        <KpiCard icon={<Snowflake className="h-3.5 w-3.5" />} label="Cooling delivered" value={fmt(t.coolKwhT)} unit="kWh_th" delta={pctChange(p.coolKwhT, t.coolKwhT)} hint="Thermal cooling energy delivered by the geothermal heat pump (thermal, not electrical)." spark={spark("coolKwT")} color="var(--cooling)" />
        <KpiCard icon={<Battery className="h-3.5 w-3.5" />} label="Battery SOC" value={fmt(c.soc, 1)} unit="%" delta={null} hint={`State of charge at ${c.label}. Operating window ${config.socMin}–${config.socMax} %.`} spark={spark("soc")} color="var(--charge)" />
        <KpiCard icon={<UtilityPole className="h-3.5 w-3.5" />} label="Grid imported" value={fmt(t.importKwh)} unit="kWh" invert delta={pctChange(p.importKwh, t.importKwh)} hint="Energy drawn from the grid after solar and battery were allocated." spark={spark("importKw")} color="var(--import)" />
        <KpiCard icon={<Gauge className="h-3.5 w-3.5" />} label="Current balance" value={`${balance >= 0 ? "+" : ""}${fmt(balance, 1)}`} unit="kW" delta={null} hint="Solar power minus campus demand right now. Positive = surplus." color="var(--export)" />
        <KpiCard icon={<Sun className="h-3.5 w-3.5" />} label="Solar self-consumption" value={fmt(t.selfConsumption, 1)} unit="%" delta={pctChange(p.selfConsumption ?? 0, t.selfConsumption ?? 0)} hint="Share of PV energy used on site (directly or stored in the battery)." />
        <KpiCard icon={<IndianRupee className="h-3.5 w-3.5" />} label="Estimated net cost" value={`${config.currency}${fmt(t.netCost)}`} invert delta={pctChange(p.netCost, t.netCost)} hint="Grid import cost minus export revenue, using configured tariffs. An estimate only." color="var(--discharge)" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle title="Live energy flow" subtitle={`Instantaneous power at ${c.label} · click a node for details`} right={<SimBadge />} />
          <FlowDiagram iv={c} cfg={config} />
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Energy balance" subtitle={`Power at ${c.label}`} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Solar generated" value={`${fmt(c.pvKw, 1)} kW`} />
            <Stat label="Campus demand" value={`${fmt(c.loadKw, 1)} kW`} />
            <Stat label="Solar → loads" value={`${fmt(c.directKw, 1)} kW`} />
            <Stat label="Solar → battery" value={`${fmt(c.chargeKw, 1)} kW`} />
            <Stat label="Solar → grid" value={`${fmt(c.exportKw, 1)} kW`} />
            <Stat label="Battery → loads" value={`${fmt(c.dischargeKw, 1)} kW`} />
            <Stat label="Grid import" value={`${fmt(c.importKw, 1)} kW`} />
            <Stat label="Curtailed" value={`${fmt(c.curtailKw, 1)} kW`} />
          </div>
          <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Demand = direct solar + battery discharge + grid import ({fmt(c.directKw, 1)} + {fmt(c.dischargeKw, 1)} + {fmt(c.importKw, 1)} ={" "}
            {fmt(c.directKw + c.dischargeKw + c.importKw, 1)} kW). Balance error: {c.balanceError.toExponential(1)} kW.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle title="Solar generation vs campus demand" subtitle="Hourly average power" />
          <TimeChart data={h} unit="kW" kind="area" series={[{ key: "pvKw", name: "Solar", color: "var(--solar)" }, { key: "loadKw", name: "Demand", color: "var(--load)" }]} />
        </Card>
        <Card>
          <CardTitle title="Battery state of charge" />
          <TimeChart data={h} unit="%" yDomain={[0, 100]} series={[{ key: "soc", name: "SOC", color: "var(--charge)" }]} />
        </Card>
        <Card>
          <CardTitle title="Grid import and export" />
          <TimeChart data={h} unit="kW" kind="bar" series={[{ key: "importKw", name: "Import", color: "var(--import)" }, { key: "exportKw", name: "Export", color: "var(--export)" }]} />
        </Card>
        <Card>
          <CardTitle title="Geothermal cooling demand" />
          <TimeChart data={h} unit="kW_th" kind="area" series={[{ key: "coolKwT", name: "Cooling", color: "var(--cooling)" }]} />
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Daily energy balance" subtitle={`Selected range: ${range}`} />
          <TimeChart
            kind="bar"
            unit="kWh"
            data={rangeSim.dayTotals.map((d) => ({
              label: d.date.toISOString().slice(5, 10),
              pv: d.pvKwh,
              load: d.loadKwh,
              imp: d.importKwh,
              exp: d.exportKwh,
            }))}
            series={[
              { key: "pv", name: "Solar", color: "var(--solar)" },
              { key: "load", name: "Demand", color: "var(--load)" },
              { key: "imp", name: "Import", color: "var(--import)" },
              { key: "exp", name: "Export", color: "var(--export)" },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
