import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Battery, Building2, Sun, UtilityPole, Snowflake, X } from "lucide-react";
import type { Interval, SimConfig } from "@/lib/sim/engine";
import { backupHours, safeCop } from "@/lib/sim/engine";
import { fmt, fmtUnit } from "@/lib/format";

type NodeId = "solar" | "load" | "battery" | "grid" | "geo";
const NODES: Record<NodeId, { x: number; y: number; label: string; color: string; Icon: typeof Sun; to: string }> = {
  solar: { x: 300, y: 50, label: "Solar PV", color: "var(--solar)", Icon: Sun, to: "/solar" },
  grid: { x: 70, y: 190, label: "Grid", color: "var(--import)", Icon: UtilityPole, to: "/energy-flow" },
  load: { x: 300, y: 190, label: "Campus bus", color: "var(--load)", Icon: Building2, to: "/energy-flow" },
  battery: { x: 530, y: 190, label: "Battery", color: "var(--charge)", Icon: Battery, to: "/battery" },
  geo: { x: 300, y: 330, label: "Geothermal HP", color: "var(--cooling)", Icon: Snowflake, to: "/geothermal" },
};

export function FlowDiagram({ iv, cfg }: { iv: Interval; cfg: SimConfig }) {
  const [sel, setSel] = useState<NodeId | null>(null);
  const toBat = iv.chargeKw;
  const fromBat = iv.dischargeKw;
  const links: { from: NodeId; to: NodeId; kw: number; color: string }[] = [
    { from: "solar", to: "load", kw: iv.directKw + toBat + iv.exportKw, color: "var(--solar)" },
    toBat > 0 ? { from: "load", to: "battery", kw: toBat, color: "var(--charge)" } : { from: "battery", to: "load", kw: fromBat, color: "var(--discharge)" },
    iv.exportKw > 0 ? { from: "load", to: "grid", kw: iv.exportKw, color: "var(--export)" } : { from: "grid", to: "load", kw: iv.importKw, color: "var(--import)" },
    { from: "load", to: "geo", kw: iv.hpKw + iv.pumpKw, color: "var(--cooling)" },
  ];
  const maxKw = Math.max(1, ...links.map((l) => l.kw));

  const details: Record<NodeId, [string, string][]> = {
    solar: [
      ["Output", fmtUnit(iv.pvKw, "kW", 1)],
      ["Irradiance", fmtUnit(iv.irradiance, "W/m²")],
      ["Panel temp.", fmtUnit(iv.panelTemp, "°C", 1)],
      ["Installed", fmtUnit(cfg.pvKwp, "kWp")],
    ],
    load: [
      ["Campus demand", fmtUnit(iv.loadKw, "kW", 1)],
      ["Direct solar", fmtUnit(iv.directKw, "kW", 1)],
      ["Other loads", fmtUnit(iv.otherLoadKw, "kW", 1)],
    ],
    battery: [
      ["Mode", iv.batteryMode],
      ["SOC", fmtUnit(iv.soc, "%", 1)],
      ["Stored", fmtUnit(iv.storedKwh, "kWh")],
      ["Power", fmtUnit(toBat || fromBat, "kW", 1)],
      ["Backup", fmtUnit(backupHours(iv.storedKwh, (cfg.battCapKwh * cfg.socMin) / 100, cfg.disEff, iv.loadKw), "h", 1)],
    ],
    grid: [
      ["Import", fmtUnit(iv.importKw, "kW", 1)],
      ["Export", fmtUnit(iv.exportKw, "kW", 1)],
      ["Tariff", `${cfg.currency}${iv.tariff}/kWh`],
    ],
    geo: [
      ["Mode", iv.coolingMode],
      ["Cooling", fmtUnit(iv.coolKwT, "kW_th", 1)],
      ["Heat pump", fmtUnit(iv.hpKw, "kW", 1)],
      ["Pump", fmtUnit(iv.pumpKw, "kW", 1)],
      ["HP COP", fmt(safeCop(iv.coolKwT, iv.hpKw), 2)],
    ],
  };

  return (
    <div className="relative">
      <svg viewBox="0 0 600 380" className="w-full" role="img" aria-label="Energy flow diagram">
        {links.map((l, i) => {
          const a = NODES[l.from];
          const b = NODES[l.to];
          const active = l.kw > 0.05;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
              {active && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={l.color}
                  strokeWidth={2 + (l.kw / maxKw) * 6}
                  strokeLinecap="round"
                  className="flow-line"
                />
              )}
              <rect x={mx - 38} y={my - 11} width={76} height={22} rx={11} fill="var(--card)" stroke="var(--border)" />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={active ? l.color : "var(--muted-foreground)"}>
                {fmt(l.kw, 0)} kW
              </text>
            </g>
          );
        })}
        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const n = NODES[id];
          return (
            <g key={id} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => setSel(id)} role="button" aria-label={n.label}>
              <circle r={34} fill="var(--card)" stroke={n.color} strokeWidth={sel === id ? 4 : 2} />
              <foreignObject x={-12} y={-18} width={24} height={24}>
                <n.Icon style={{ color: n.color, width: 24, height: 24 }} />
              </foreignObject>
              <text y={18} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {sel && (
        <div className="absolute right-0 top-0 w-60 rounded-xl border bg-popover p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{NODES[sel].label}</span>
            <button onClick={() => setSel(null)} aria-label="Close details">
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="space-y-1 text-xs">
            {details[sel].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular font-medium capitalize">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to={NODES[sel].to} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            Open page →
          </Link>
        </div>
      )}
    </div>
  );
}
