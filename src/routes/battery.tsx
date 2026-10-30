import { createFileRoute } from "@tanstack/react-router";
import { useSim } from "@/lib/sim/store";
import { backupHours, type Strategy } from "@/lib/sim/engine";
import { fmt, fmtUnit } from "@/lib/format";
import { Card, CardTitle, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { TimeChart, hourly } from "@/components/ss/charts";
import { NumField } from "@/components/ss/fields";
import { SimControls } from "@/components/ss/SimControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/battery")({
  head: pageHead("Battery Storage", "Battery state of charge, charge and discharge history, backup duration and dispatch strategy."),
  component: BatteryPage,
});

export const STRATEGIES: Record<Strategy, string> = {
  "solar-first": "Solar-first charging",
  "load-first": "Load-first operation",
  "peak-reduction": "Peak-demand reduction",
  "backup-reserve": "Backup reserve protection",
  scheduled: "Scheduled (discharge 17:00–22:00)",
};

function Ring({ value }: { value: number }) {
  const r = 70;
  const C = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 180 180" className="mx-auto h-44 w-44" role="img" aria-label={`State of charge ${value.toFixed(0)} percent`}>
      <circle cx="90" cy="90" r={r} stroke="var(--muted)" strokeWidth="14" fill="none" />
      <circle cx="90" cy="90" r={r} stroke="var(--charge)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={`${(value / 100) * C} ${C}`} transform="rotate(-90 90 90)" />
      <text x="90" y="92" textAnchor="middle" fontSize="30" fontWeight="600" fill="var(--foreground)">{value.toFixed(0)}%</text>
      <text x="90" y="114" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">State of charge</text>
    </svg>
  );
}

function BatteryPage() {
  const { day, current: c, config, updateConfig } = useSim();
  const minKwh = (config.battCapKwh * config.socMin) / 100;
  const usable = Math.max(0, c.storedKwh - minKwh) * (config.disEff / 100);
  const backup = backupHours(c.storedKwh, minKwh, config.disEff, c.loadKw);
  const h = hourly(day.intervals, ["storedKwh", "chargeKw", "dischargeKw", "soc"]).map((r) => ({ ...r, dischargeNeg: -(r["dischargeKw"] as number) }));
  const timeline = day.intervals.filter((_, i) => i % 2 === 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Battery Storage" description="Charging and discharging never happen in the same interval. SOC is held within the configured limits." actions={<SimBadge />} />
      <SimControls />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle title={`Status at ${c.label}`} />
          <Ring value={c.soc} />
          <p className="mt-2 text-center text-sm capitalize">
            Mode: <span className="font-semibold">{c.batteryMode}</span>
          </p>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle title="Metrics" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Capacity" value={`${fmt(config.battCapKwh)} kWh`} sub="Configured" />
            <Stat label="Stored energy" value={`${fmt(c.storedKwh)} kWh`} />
            <Stat label="State of health" value="Not modeled" />
            <Stat label="Charging power" value={`${fmt(c.chargeKw, 1)} kW`} />
            <Stat label="Discharging power" value={`${fmt(c.dischargeKw, 1)} kW`} />
            <Stat label="Round-trip efficiency" value={`${fmt((config.chEff * config.disEff) / 100, 1)} %`} />
            <Stat label="Usable energy" value={`${fmt(usable)} kWh`} sub={`Above ${config.socMin} % min, after losses`} />
            <Stat label="Backup duration" value={fmtUnit(backup, "h", 1)} sub={`At current ${fmt(c.loadKw)} kW load`} />
            <Stat label="Throughput today" value={`${fmt(day.totals.chargeKwh + day.totals.dischargeKwh)} kWh`} />
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle title="Stored energy" />
          <TimeChart data={h} unit="kWh" kind="area" series={[{ key: "storedKwh", name: "Stored", color: "var(--charge)" }]} />
        </Card>
        <Card>
          <CardTitle title="Charging vs discharging" subtitle="Discharge shown negative" />
          <TimeChart data={h} unit="kW" kind="bar" series={[{ key: "chargeKw", name: "Charging", color: "var(--charge)" }, { key: "dischargeNeg", name: "Discharging", color: "var(--discharge)" }]} />
        </Card>
      </div>
      <Card>
        <CardTitle title="Operating timeline" subtitle="30-minute resolution" />
        <div className="flex h-8 overflow-hidden rounded-md">
          {timeline.map((i) => (
            <div
              key={i.t}
              title={`${i.label}: ${i.batteryMode}`}
              className={`flex-1 ${i.batteryMode === "charging" ? "bg-charge" : i.batteryMode === "discharging" ? "bg-discharge" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
        <div className="mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-charge" />Charging</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-discharge" />Discharging</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Idle</span>
        </div>
      </Card>
      <Card>
        <CardTitle title="Battery configuration" subtitle="Changes re-run the dispatch simulation." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Operating strategy</Label>
            <Select value={config.strategy} onValueChange={(v) => updateConfig({ strategy: v as Strategy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STRATEGIES) as Strategy[]).map((k) => (
                  <SelectItem key={k} value={k}>{STRATEGIES[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumField k="battCapKwh" label="Capacity" unit="kWh" min={0} max={50000} />
          <NumField k="socMin" label="Minimum SOC" unit="%" min={0} max={100} />
          <NumField k="socMax" label="Maximum SOC" unit="%" min={0} max={100} />
          <NumField k="reserveSoc" label="Reserve SOC" unit="%" min={0} max={100} help="Floor under backup-reserve strategy" />
          <NumField k="chEff" label="Charge efficiency" unit="%" min={50} max={100} step={0.5} />
          <NumField k="disEff" label="Discharge efficiency" unit="%" min={50} max={100} step={0.5} />
          <NumField k="maxChKw" label="Max charge power" unit="kW" min={0} max={10000} />
          <NumField k="maxDisKw" label="Max discharge power" unit="kW" min={0} max={10000} />
          <NumField k="peakThresholdKw" label="Peak threshold" unit="kW" min={0} max={10000} help="Used by peak-demand reduction" />
          <NumField k="initialSoc" label="Start-of-day SOC" unit="%" min={0} max={100} />
        </div>
      </Card>
    </div>
  );
}
