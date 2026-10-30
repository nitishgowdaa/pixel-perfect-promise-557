export const fmt = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const fmtUnit = (v: number | null | undefined, unit: string, digits = 0) =>
  v == null || !Number.isFinite(v) ? "Unavailable" : `${fmt(v, digits)} ${unit}`;

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const head = Object.keys(rows[0]!);
  const esc = (x: string | number) => {
    const s = String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h] ?? "")).join(","))].join("\n");
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
