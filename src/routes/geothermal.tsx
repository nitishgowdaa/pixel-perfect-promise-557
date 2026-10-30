import { createFileRoute } from "@tanstack/react-router";
import { useSim } from "@/lib/sim/store";
import { safeCop } from "@/lib/sim/engine";
import { fmt, fmtUnit } from "@/lib/format";
import { Card, CardTitle, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { TimeChart, hourly } from "@/components/ss/charts";
import { BoolField, NumField } from "@/components/ss/fields";
import { SimControls } from "@/components/ss/SimControls";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/geothermal")({
  head: pageHead("Geothermal Cooling", "Ground-source heat-pump cooling: loop temperatures, COP, cooling delivered and schedules."),
  component: Geo,
});

const MODE_LABEL = { idle: "Idle", cooling: "Cooling", "pre-cooling": "Pre-cooling", scheduled: "Scheduled cooling", fault: "Fault / no data" };

function Geo() {
  const { day, current: c, config } = useSim();
  const hpCop = safeCop(c.coolKwT, c.hpKw);
  const sysCop = safeCop(c.coolKwT, c.hpKw + c.pumpKw);
  const h = hourly(day.intervals, ["coolKwT", "hpKw", "pumpKw", "loopIn", "loopOut", "supplyT", "returnT"]);
  const active = c.coolKwT > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Geothermal Cooling" description="Heat-pump electricity is counted in campus demand; cooling delivered is thermal energy and reported separately." actions={<SimBadge />} />
      <SimControls />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle title="System schematic" subtitle={`Mode: ${MODE_LABEL[c.coolingMode]} at ${c.label}`} />
          <svg viewBox="0 0 600 300" className="w-full" role="img" aria-label="Geothermal schematic">
            <rect x="0" y="200" width="600" height="100" fill="var(--muted)" />
            <text x="12" y="222" fontSize="11" fill="var(--muted-foreground)">Ground · {fmt(config.groundTemp, 1)} °C</text>
            {[90, 150, 210].map((x) => (
              <path key={x} d={`M${x} 140 V280 H${x + 30} V140`} fill="none" stroke="var(--cooling)" strokeWidth="4" className={active ? "flow-line" : ""} />
            ))}
            <path d="M90 140 H270" stroke="var(--discharge)" strokeWidth="4" fill="none" />
            <path d="M240 120 H270" stroke="var(--cooling)" strokeWidth="4" fill="none" />
            <text x="60" y="110" fontSize="11" fill="var(--foreground)">Loop in {fmt(c.loopIn, 1)} °C</text>
            <text x="60" y="126" fontSize="11" fill="var(--foreground)">Loop out {fmt(c.loopOut, 1)} °C</text>
            <rect x="270" y="90" width="110" height="80" rx="10" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
            <text x="325" y="125" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">Heat pump</text>
            <text x="325" y="143" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{fmt(c.hpKw, 1)} kW_e</text>
            <circle cx="250" cy="180" r="14" fill="var(--card)" stroke="var(--charge)" strokeWidth="2" />
            <text x="250" y="205" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">Pump {fmt(c.pumpKw, 0)} kW</text>
            <path d="M380 110 H470" stroke="var(--cooling)" strokeWidth="4" className={active ? "flow-line" : ""} />
            <path d="M470 150 H380" stroke="var(--discharge)" strokeWidth="4" className={active ? "flow-line" : ""} />
            <rect x="470" y="60" width="110" height="120" rx="10" fill="var(--card)" stroke="var(--load)" strokeWidth="2" />
            <text x="525" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">Campus</text>
            <text x="525" y="115" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">Supply {fmt(c.supplyT, 1)} °C</text>
            <text x="525" y="132" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">Return {fmt(c.returnT, 1)} °C</text>
            <text x="525" y="155" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--cooling)">{fmt(c.coolKwT, 0)} kW_th</text>
          </svg>
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Metrics" />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Ground temperature" value={`${fmt(config.groundTemp, 1)} °C`} sub="Configured" />
            <Stat label="Cooling capacity" value={`${fmt(c.coolKwT, 1)} kW_th`} />
            <Stat label="Heat-pump power" value={`${fmt(c.hpKw, 1)} kW`} />
            <Stat label="Pump power" value={`${fmt(c.pumpKw, 1)} kW`} />
            <Stat label="Heat-pump COP" value={fmtUnit(hpCop, "", 2)} sub={hpCop == null ? "Not running" : "Cooling ÷ HP input"} />
            <Stat label="System COP" value={fmtUnit(sysCop, "", 2)} sub="Includes pump power" />
            <Stat label="Cooling today" value={`${fmt(day.totals.coolKwhT)} kWh_th`} />
            <Stat label="Electricity today" value={`${fmt(day.totals.hpKwh + day.totals.pumpKwh)} kWh`} />
            <Stat label="Daily avg. HP COP" value={fmtUnit(day.totals.avgCop, "", 2)} />
            <Stat label="Thermal ΔT (ṁ·cp)" value={c.coolKwT > 0 ? `${fmt(c.returnT - c.supplyT, 2)} K` : "—"} sub={`${config.flowKgS} kg/s, 4.186 kJ/kg·K`} />
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle title="Cooling delivered vs electricity used" />
          <TimeChart data={h} unit="kW" series={[{ key: "coolKwT", name: "Cooling (kW_th)", color: "var(--cooling)" }, { key: "hpKw", name: "Heat pump (kW_e)", color: "var(--primary)" }, { key: "pumpKw", name: "Pump (kW_e)", color: "var(--charge)" }]} />
        </Card>
        <Card>
          <CardTitle title="Loop temperatures" />
          <TimeChart data={h} unit="°C" series={[{ key: "loopIn", name: "Ground in", color: "var(--discharge)" }, { key: "loopOut", name: "Ground out", color: "var(--cooling)" }, { key: "supplyT", name: "Supply", color: "var(--solar)" }, { key: "returnT", name: "Return", color: "var(--import)", dashed: true }]} />
        </Card>
      </div>
      <Card>
        <CardTitle title="Cooling controls" subtitle="These adjust the simulator only — no physical equipment is controlled." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumField k="setpoint" label="Target cooling temperature" unit="°C" min={18} max={30} step={0.5} />
          <NumField k="workStart" label="Schedule start" unit="h" min={0} max={23} />
          <NumField k="workEnd" label="Schedule end" unit="h" min={1} max={24} />
          <NumField k="coolCapKwT" label="Max cooling capacity" unit="kW_th" min={0} max={10000} />
          <NumField k="cop" label="Heat-pump COP" min={1} max={10} step={0.1} />
          <NumField k="pumpKw" label="Circulation pump" unit="kW" min={0} max={500} />
          <NumField k="precoolHours" label="Pre-cooling window" unit="h" min={0} max={4} step={0.25} />
          <BoolField k="precool" label="Solar-aware pre-cooling" help="Cools before occupancy on hot days" />
        </div>
      </Card>
    </div>
  );
}
