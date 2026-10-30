import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Series {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
  stack?: string;
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 },
};

export function TimeChart({
  data,
  x = "label",
  series,
  unit,
  kind = "line",
  height = 260,
  yDomain,
}: {
  data: object[];
  x?: string;
  series: Series[];
  unit: string;
  kind?: "line" | "area" | "bar";
  height?: number;
  yDomain?: [number, number];
}) {
  if (!data.length)
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data for this period.</div>;
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey={x} tick={axis} minTickGap={28} tickLine={false} axisLine={false} />
      <YAxis
        tick={axis}
        tickLine={false}
        axisLine={false}
        width={56}
        domain={yDomain}
        label={{ value: unit, angle: -90, position: "insideLeft", style: { ...axis, textAnchor: "middle" } }}
      />
      <Tooltip {...tip} formatter={(v: number) => `${v.toFixed(1)} ${unit}`} />
      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
    </>
  );
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        {kind === "bar" ? (
          <BarChart data={data}>
            {common}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={s.stack} radius={s.stack ? 0 : [3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : kind === "area" ? (
          <AreaChart data={data}>
            {common}
            {series.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.15}
                strokeWidth={2}
                stackId={s.stack}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data}>
            {common}
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Aggregate 15-min intervals into hourly averages (kW) for readable charts. */
export function hourly<T extends { hour: number; day: number; label: string }>(rows: T[], keys: (keyof T)[]) {
  const out: Record<string, number | string>[] = [];
  for (let i = 0; i < rows.length; i += 4) {
    const chunk = rows.slice(i, i + 4);
    const r: Record<string, number | string> = { label: chunk[0].label };
    for (const k of keys) r[k as string] = chunk.reduce((a, c) => a + (c[k] as number), 0) / chunk.length;
    out.push(r);
  }
  return out;
}
