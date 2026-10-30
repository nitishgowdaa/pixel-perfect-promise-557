import { createFileRoute } from "@tanstack/react-router";
import { useSim } from "@/lib/sim/store";
import { fmt, fmtUnit } from "@/lib/format";
import { Card, CardTitle, PageHeader, SimBadge, Stat } from "@/components/ss/ui";
import { FlowDiagram } from "@/components/ss/FlowDiagram";
import { SimControls } from "@/components/ss/SimControls";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/energy-flow")({
  head: pageHead("Energy Flow", "Where every kWh goes: solar allocation, battery contribution, geothermal use and grid dependency."),
  component: Flow,
});

interface Band { label: string; kwh: number; color: string }

/** Proportional two-column Sankey: sources (left) to uses (right). Widths come straight from totals. */
function Sankey({ sources, uses }: { sources: Band[]; uses: Band[] }) {
  const H = 320;
  const total = Math.max(1e-9, sources.reduce((a, s) => a + s.kwh, 0));
  const totalU = Math.max(1e-9, uses.reduce((a, s) => a + s.kwh, 0));
  const gap = 8;
  const layout = (bands: Band[], tot: number) => {
    let y = 0;
    const avail = H - gap * (bands.length - 1);
    return bands.map((b) => {
      const h = (b.kwh / tot) * avail;
      const r = { ...b, y, h };
      y += h + gap;
      return r;
    });
  };
  const L = layout(sources, total);
  const R = layout(uses, totalU);
  return (
    <svg viewBox={`0 0 600 ${H}`} className="w-full" role="img" aria-label="Daily energy Sankey">
      {L.map((l) => (
        <g key={l.label}>
          <rect x={0} y={l.y} width={14} height={Math.max(1, l.h)} fill={l.color} rx={2} />
          <text x={20} y={l.y + l.h / 2 + 4} fontSize={11} fill="var(--foreground)">{l.label} · {fmt(l.kwh)} kWh</text>
        </g>
      ))}
      <path d={`M180 0 C 300 0, 300 0, 420 0 L420 ${H} C300 ${H},300 ${H},180 ${H} Z`} fill="var(--muted)" opacity={0.7} />
      <text x={300} y={H / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--muted-foreground)">Electrical bus</text>
      {R.map((r) => (
        <g key={r.label}>
          <rect x={586} y={r.y} width={14} height={Math.max(1, r.h)} fill={r.color} rx={2} />
          <text x={580} y={r.y + r.h / 2 + 4} textAnchor="end" fontSize={11} fill="var(--foreground)">{r.label} · {fmt(r.kwh)} kWh</text>
        </g>
      ))}
    </svg>
  );
}

function Flow() {
  const { day, current, config } = useSim();
  const t = day.totals;
  const sources: Band[] = [
    { label: "Solar PV", kwh: t.pvKwh, color: "var(--solar)" },
    { label: "Battery discharge", kwh: t.dischargeKwh, color: "var(--discharge)" },
    { label: "Grid import", kwh: t.importKwh, color: "var(--import)" },
  ].filter((b) => b.kwh > 0.01);
  const uses: Band[] = [
    { label: "Campus loads", kwh: t.loadKwh - t.hpKwh - t.pumpKwh, color: "var(--load)" },
    { label: "Geothermal (HP + pump)", kwh: t.hpKwh + t.pumpKwh, color: "var(--cooling)" },
    { label: "Battery charging", kwh: t.chargeKwh, color: "var(--charge)" },
    { label: "Grid export", kwh: t.exportKwh, color: "var(--export)" },
    { label: "Curtailed", kwh: t.curtailKwh, color: "var(--muted-foreground)" },
  ].filter((b) => b.kwh > 0.01);
  const unexplained = sources.reduce((a, s) => a + s.kwh, 0) - uses.reduce((a, s) => a + s.kwh, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Energy Flow" description="Band sizes are proportional to simulated daily energy. Inputs and outputs of the electrical bus must match." actions={<SimBadge />} />
      <SimControls />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Demand met by solar" value={fmtUnit(t.loadKwh > 0 ? (t.directKwh / t.loadKwh) * 100 : null, "%", 1)} sub="Direct use" />
        <Stat label="Battery contribution" value={fmtUnit(t.loadKwh > 0 ? (t.dischargeKwh / t.loadKwh) * 100 : null, "%", 1)} />
        <Stat label="Grid dependency" value={fmtUnit(t.gridDependency, "%", 1)} />
        <Stat label="Solar exported" value={`${fmt(t.exportKwh)} kWh`} />
        <Stat label="Battery losses" value={`${fmt(t.chargeKwh - t.dischargeKwh - (day.intervals.at(-1)!.storedKwh - (config.battCapKwh * config.initialSoc) / 100))} kWh`} sub="Charge − discharge − ΔStored" />
        <Stat label="Unallocated energy" value={`${fmt(Math.abs(unexplained), 3)} kWh`} sub={Math.abs(unexplained) < 0.01 ? "Balanced ✓" : "Check inputs"} />
      </div>
      <Card>
        <CardTitle title="Daily energy allocation" subtitle={day.intervals[0]!.label + " – 24:00"} />
        <Sankey sources={sources} uses={uses} />
      </Card>
      <Card>
        <CardTitle title="Instantaneous power flow" subtitle={`At ${current.label}`} />
        <FlowDiagram iv={current} cfg={config} />
      </Card>
    </div>
  );
}
