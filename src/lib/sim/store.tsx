import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_CONFIG,
  STEPS_PER_DAY,
  deriveAlerts,
  forecast,
  simulate,
  type AlertItem,
  type Scenario,
  type SimConfig,
} from "./engine";

export type RangeKey = "today" | "yesterday" | "7d" | "30d";
export const RANGE_LABELS: Record<RangeKey, string> = { today: "Today", yesterday: "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days" };

export const CAMPUSES: { id: string; config: SimConfig }[] = [
  { id: "demo-eng", config: DEFAULT_CONFIG },
  {
    id: "demo-north",
    config: {
      ...DEFAULT_CONFIG,
      campusName: "Demo North Campus",
      locationName: "Pune, India (sample location)",
      lat: 18.52,
      lon: 73.86,
      pvKwp: 350,
      battCapKwh: 500,
      maxChKw: 150,
      maxDisKw: 150,
      baseLoadKw: 140,
      peakLoadKw: 400,
      coolCapKwT: 450,
      peakThresholdKw: 300,
    },
  },
];

type AlertState = Record<string, "acknowledged" | "resolved">;

function todayUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
export const dateKeyOf = (d: Date) => d.toISOString().slice(0, 10);

function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV({ ...(initial as object), ...JSON.parse(raw) } as T);
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (ready) localStorage.setItem(key, JSON.stringify(v));
  }, [key, v, ready]);
  return [v, setV] as const;
}

function useSimState() {
  const [campusId, setCampusId] = useStored<{ id: string }>("ss.campus", { id: CAMPUSES[0]!.id });
  const base = CAMPUSES.find((c) => c.id === campusId.id) ?? CAMPUSES[0]!;
  const [overrides, setOverrides] = useStored<Record<string, Partial<SimConfig>>>("ss.config", {});
  const config: SimConfig = useMemo(() => ({ ...base.config, ...(overrides[base.id] ?? {}) }), [base, overrides]);
  const [scenario, setScenario] = useState<Scenario>("clear");
  const [date, setDate] = useState<Date>(todayUtc);
  const [range, setRange] = useState<RangeKey>("today");
  const [step, setStep] = useState(48);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [alertState, setAlertState] = useStored<AlertState>("ss.alerts", {});

  const updateConfig = useCallback(
    (patch: Partial<SimConfig>) => setOverrides((o) => ({ ...o, [base.id]: { ...(o[base.id] ?? {}), ...patch } })),
    [base.id, setOverrides],
  );
  const resetConfig = useCallback(() => setOverrides((o) => ({ ...o, [base.id]: {} })), [base.id, setOverrides]);

  const day = useMemo(() => simulate(config, { scenario, date }), [config, scenario, date]);
  const rangeSim = useMemo(() => {
    if (range === "today") return day;
    const days = range === "yesterday" ? 1 : range === "7d" ? 7 : 30;
    const start = new Date(date.getTime() - (range === "yesterday" ? 1 : days - 1) * 86400000);
    return simulate(config, { scenario, date: start, days });
  }, [config, scenario, date, range, day]);
  const prevDay = useMemo(
    () => simulate(config, { scenario, date: new Date(date.getTime() - 86400000) }),
    [config, scenario, date],
  );

  const current = day.intervals[Math.min(step, STEPS_PER_DAY - 1)]!;
  const fc = useMemo(
    () => forecast(config, scenario, new Date(date.getTime() + 86400000), day.intervals[STEPS_PER_DAY - 1]!.soc),
    [config, scenario, date, day],
  );
  const dateKey = dateKeyOf(date);
  const alerts: (AlertItem & { status: "open" | "acknowledged" | "resolved" })[] = useMemo(
    () => deriveAlerts(config, day, fc.points, dateKey).map((a) => ({ ...a, status: alertState[a.id] ?? "open" })),
    [config, day, fc, dateKey, alertState],
  );

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS_PER_DAY), 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed]);

  return {
    campuses: CAMPUSES,
    campusId: base.id,
    setCampusId: (id: string) => setCampusId({ id }),
    config,
    updateConfig,
    resetConfig,
    scenario,
    setScenario,
    date,
    setDate,
    range,
    setRange,
    step,
    setStep,
    playing,
    setPlaying,
    speed,
    setSpeed,
    day,
    prevDay,
    rangeSim,
    current,
    forecast: fc,
    alerts,
    setAlertStatus: (id: string, s: "acknowledged" | "resolved") => setAlertState((a) => ({ ...a, [id]: s })),
  };
}

type Ctx = ReturnType<typeof useSimState>;
const SimCtx = createContext<Ctx | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const v = useSimState();
  return <SimCtx.Provider value={v}>{children}</SimCtx.Provider>;
}

export function useSim() {
  const c = useContext(SimCtx);
  if (!c) throw new Error("useSim must be used inside SimProvider");
  return c;
}
