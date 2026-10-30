// SolarSync simulation engine — single source of truth for every number in the app.
// Units: power kW, electrical energy kWh, thermal energy kWh_th, temperature °C, irradiance W/m².

export const DT_H = 0.25; // 15-minute interval
export const STEPS_PER_DAY = 96;
export const REF_IRRADIANCE = 1000; // W/m² (STC)

export type Strategy = "solar-first" | "load-first" | "peak-reduction" | "backup-reserve" | "scheduled";
export type Scenario = "clear" | "partly-cloudy" | "cloudy" | "hot" | "high-demand" | "low-demand";

export interface SimConfig {
  campusName: string;
  locationName: string;
  lat: number;
  lon: number;
  timezone: string;
  // solar
  pvKwp: number;
  panelEfficiency: number; // %
  tilt: number;
  azimuth: number;
  inverterEff: number; // %
  systemLosses: number; // %
  derating: number; // %
  tempCoef: number; // %/°C (negative)
  // campus demand
  baseLoadKw: number;
  peakLoadKw: number;
  workStart: number;
  workEnd: number;
  weekendFactor: number; // 0..1
  // geothermal
  coolCapKwT: number;
  cop: number;
  pumpKw: number;
  groundTemp: number;
  setpoint: number;
  precool: boolean;
  precoolHours: number;
  flowKgS: number;
  // battery
  battCapKwh: number;
  socMin: number;
  socMax: number;
  reserveSoc: number;
  chEff: number; // %
  disEff: number; // %
  maxChKw: number;
  maxDisKw: number;
  strategy: Strategy;
  peakThresholdKw: number;
  initialSoc: number;
  // economics
  importTariff: number;
  exportTariff: number;
  touEnabled: boolean;
  touPeakTariff: number;
  emissionsFactor: number; // kg CO2 / kWh
  exportAllowed: boolean;
  currency: string;
  // baseline
  baselineChillerCop: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  campusName: "Demo Engineering Campus",
  locationName: "Bengaluru, India (sample location)",
  lat: 12.97,
  lon: 77.59,
  timezone: "Asia/Kolkata",
  pvKwp: 600,
  panelEfficiency: 21,
  tilt: 13,
  azimuth: 180,
  inverterEff: 97,
  systemLosses: 12,
  derating: 0,
  tempCoef: -0.4,
  baseLoadKw: 220,
  peakLoadKw: 620,
  workStart: 8,
  workEnd: 18,
  weekendFactor: 0.45,
  coolCapKwT: 700,
  cop: 4.5,
  pumpKw: 18,
  groundTemp: 24,
  setpoint: 24,
  precool: true,
  precoolHours: 2,
  flowKgS: 25,
  battCapKwh: 1000,
  socMin: 10,
  socMax: 95,
  reserveSoc: 25,
  chEff: 95,
  disEff: 95,
  maxChKw: 300,
  maxDisKw: 300,
  strategy: "solar-first",
  peakThresholdKw: 450,
  initialSoc: 50,
  importTariff: 8.5,
  exportTariff: 3.5,
  touEnabled: true,
  touPeakTariff: 11,
  emissionsFactor: 0.71,
  exportAllowed: true,
  currency: "₹",
  baselineChillerCop: 2.8,
};

export const SCENARIOS: Record<Scenario, { label: string; cloud: number; tempOffset: number; demand: number; noise: number }> = {
  clear: { label: "Clear sky", cloud: 1, tempOffset: 0, demand: 1, noise: 0.03 },
  "partly-cloudy": { label: "Partly cloudy", cloud: 0.7, tempOffset: -1, demand: 1, noise: 0.25 },
  cloudy: { label: "Cloudy", cloud: 0.35, tempOffset: -3, demand: 1, noise: 0.15 },
  hot: { label: "Hot day", cloud: 0.95, tempOffset: 5, demand: 1.05, noise: 0.05 },
  "high-demand": { label: "High campus demand", cloud: 0.85, tempOffset: 1, demand: 1.3, noise: 0.1 },
  "low-demand": { label: "Low campus demand", cloud: 0.85, tempOffset: 0, demand: 0.7, noise: 0.1 },
};

export type BatteryMode = "charging" | "discharging" | "idle";
export type CoolingMode = "idle" | "cooling" | "pre-cooling" | "scheduled" | "fault";

export interface Interval {
  t: number; // step index within its day
  day: number; // day offset
  hour: number; // fractional hour
  label: string;
  irradiance: number;
  ambient: number;
  panelTemp: number;
  pvKw: number;
  otherLoadKw: number;
  coolKwT: number;
  hpKw: number;
  pumpKw: number;
  loadKw: number; // total campus electrical demand (incl. heat pump + pump)
  directKw: number;
  chargeKw: number; // power drawn from bus into battery
  dischargeKw: number; // power delivered to bus by battery
  exportKw: number;
  curtailKw: number;
  importKw: number;
  storedKwh: number; // end-of-interval
  soc: number;
  batteryMode: BatteryMode;
  coolingMode: CoolingMode;
  loopIn: number;
  loopOut: number;
  supplyT: number;
  returnT: number;
  tariff: number;
  balanceError: number;
}

export interface Totals {
  pvKwh: number;
  loadKwh: number;
  directKwh: number;
  chargeKwh: number;
  dischargeKwh: number;
  exportKwh: number;
  curtailKwh: number;
  importKwh: number;
  coolKwhT: number;
  hpKwh: number;
  pumpKwh: number;
  peakImportKw: number;
  cost: number;
  exportRevenue: number;
  netCost: number;
  emissionsKg: number;
  selfConsumption: number | null; // % of PV used on site
  solarFraction: number | null; // % of demand supplied by solar (direct + via battery approx)
  gridDependency: number | null;
  avgCop: number | null;
  systemCop: number | null;
  maxBalanceError: number;
}

// Deterministic PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
}

export function occupancy(hour: number, cfg: Pick<SimConfig, "workStart" | "workEnd">) {
  const { workStart: s, workEnd: e } = cfg;
  if (hour < s - 1 || hour >= e + 2) return 0.05;
  if (hour < s) return 0.05 + 0.6 * (hour - (s - 1));
  if (hour >= e) return 0.65 * (1 - (hour - e) / 2) + 0.05;
  const mid = (s + e) / 2;
  return 0.8 + 0.2 * Math.cos(((hour - mid) / (e - s)) * Math.PI);
}

export interface SimOptions {
  scenario: Scenario;
  date: Date; // first day
  days?: number;
  mode?: "solarsync" | "baseline";
  demandScale?: number;
}

export interface SimResult {
  intervals: Interval[];
  totals: Totals;
  dayTotals: (Totals & { date: Date })[];
  issues: string[];
}

export function validateConfig(c: SimConfig): string[] {
  const e: string[] = [];
  if (c.pvKwp < 0) e.push("PV capacity cannot be negative.");
  if (c.inverterEff <= 0 || c.inverterEff > 100) e.push("Inverter efficiency must be between 0 and 100 %.");
  if (c.systemLosses < 0 || c.systemLosses >= 100) e.push("System losses must be between 0 and 100 %.");
  if (c.socMin >= c.socMax) e.push("Minimum SOC must be lower than maximum SOC.");
  if (c.reserveSoc < c.socMin || c.reserveSoc > c.socMax) e.push("Reserve SOC must lie between minimum and maximum SOC.");
  if (c.initialSoc < 0 || c.initialSoc > 100) e.push("Initial SOC must be 0–100 %.");
  if (c.chEff <= 0 || c.chEff > 100 || c.disEff <= 0 || c.disEff > 100) e.push("Battery efficiencies must be between 0 and 100 %.");
  if (c.cop <= 0) e.push("Heat-pump COP must be greater than zero.");
  if (c.baselineChillerCop <= 0) e.push("Baseline chiller COP must be greater than zero.");
  if (c.peakLoadKw < c.baseLoadKw) e.push("Peak load must be at least the base load.");
  if (c.workStart >= c.workEnd) e.push("Working hours must start before they end.");
  if (c.battCapKwh < 0 || c.maxChKw < 0 || c.maxDisKw < 0) e.push("Battery capacity and power limits cannot be negative.");
  if (Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180) e.push("Coordinates are out of range.");
  return e;
}

export function simulate(cfg: SimConfig, opts: SimOptions): SimResult {
  const days = opts.days ?? 1;
  const mode = opts.mode ?? "solarsync";
  const sc = SCENARIOS[opts.scenario];
  const issues = validateConfig(cfg);
  const intervals: Interval[] = [];
  const cap = Math.max(0, cfg.battCapKwh);
  const useBattery = mode === "solarsync" && cap > 0;
  const eMax = (cap * cfg.socMax) / 100;
  const floorSoc = cfg.strategy === "backup-reserve" ? cfg.reserveSoc : cfg.socMin;
  const eMin = (cap * floorSoc) / 100;
  let stored = useBattery ? clamp((cap * cfg.initialSoc) / 100, (cap * cfg.socMin) / 100, eMax) : 0;
  const chEff = cfg.chEff / 100;
  const disEff = cfg.disEff / 100;
  const cop = mode === "baseline" ? cfg.baselineChillerCop : cfg.cop;
  const perf = (cfg.inverterEff / 100) * (1 - cfg.systemLosses / 100) * (1 - cfg.derating / 100);
  const demandScale = (opts.demandScale ?? 1) * sc.demand;

  for (let d = 0; d < days; d++) {
    const date = new Date(opts.date.getTime() + d * 86400000);
    const doy = dayOfYear(date);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const seasonal = 1 + 0.08 * Math.sin(((doy - 80) / 365) * 2 * Math.PI); // warmer/sunnier pre-monsoon
    const rand = mulberry32(doy * 1000 + Object.keys(SCENARIOS).indexOf(opts.scenario) * 7 + date.getUTCFullYear());
    // Daily max temperature computed first so pre-cooling can anticipate it.
    const tMax = 31 + 3 * seasonal + sc.tempOffset;
    const hotAhead = tMax - cfg.setpoint > 6;
    let cloudState = 1;

    for (let t = 0; t < STEPS_PER_DAY; t++) {
      const hour = t * DT_H + DT_H / 2;
      cloudState = clamp(cloudState * 0.7 + 0.3 * (1 - sc.noise * rand() * 2.2), 0.2, 1);
      const sun = hour > 6 && hour < 18.5 ? Math.pow(Math.sin((Math.PI * (hour - 6)) / 12.5), 1.25) : 0;
      const irradiance = Math.max(0, 1000 * seasonal * sc.cloud * cloudState * sun * 0.98);
      const ambient = tMax - 8 + 8 * Math.sin((Math.PI * (hour - 8.5)) / 12) * (hour > 2.5 && hour < 20.5 ? 1 : 0.3);
      const panelTemp = ambient + (irradiance / 800) * 25;
      const pvKw = clamp(
        cfg.pvKwp * (irradiance / REF_IRRADIANCE) * (1 + (cfg.tempCoef / 100) * (panelTemp - 25)) * perf,
        0,
        cfg.pvKwp,
      );

      const occ = occupancy(hour, cfg) * (weekend ? cfg.weekendFactor : 1);
      const otherLoadKw = (cfg.baseLoadKw + (cfg.peakLoadKw - cfg.baseLoadKw) * occ) * demandScale;

      // Cooling load (thermal)
      let coolingMode: CoolingMode = "idle";
      let coolKwT = 0;
      const k = cfg.coolCapKwT / 12;
      const occupied = hour >= cfg.workStart && hour < cfg.workEnd;
      if (occupied && ambient > cfg.setpoint) {
        coolKwT = Math.min(cfg.coolCapKwT, (ambient - cfg.setpoint) * k * Math.max(occ, 0.3) * (weekend ? 0.6 : 1));
        coolingMode = coolKwT > 0 ? "cooling" : "idle";
      } else if (
        mode === "solarsync" &&
        cfg.precool &&
        hotAhead &&
        hour >= cfg.workStart - cfg.precoolHours &&
        hour < cfg.workStart
      ) {
        coolKwT = cfg.coolCapKwT * 0.35;
        coolingMode = "pre-cooling";
      }
      // Pre-cooling shaves part of morning load later
      if (mode === "solarsync" && cfg.precool && hotAhead && occupied && hour < cfg.workStart + 2) {
        coolKwT *= 0.75;
      }
      const hpKw = coolKwT > 0 ? coolKwT / cop : 0;
      const pumpKw = coolKwT > 0 && mode === "solarsync" ? cfg.pumpKw : coolKwT > 0 ? cfg.pumpKw * 0.6 : 0;
      const loadKw = otherLoadKw + hpKw + pumpKw;

      // Bus allocation
      const directKw = Math.min(pvKw, loadKw);
      let surplus = pvKw - directKw;
      let deficit = loadKw - directKw;
      let chargeKw = 0;
      let dischargeKw = 0;

      if (useBattery) {
        if (surplus > 0) {
          const room = Math.max(0, eMax - stored);
          chargeKw = Math.min(surplus, cfg.maxChKw, room / (chEff * DT_H));
          stored += chargeKw * chEff * DT_H;
          surplus -= chargeKw;
        } else if (deficit > 0) {
          let want = deficit;
          if (cfg.strategy === "peak-reduction") want = Math.max(0, loadKw - cfg.peakThresholdKw);
          if (cfg.strategy === "scheduled" && !(hour >= 17 && hour < 22)) want = 0;
          const avail = Math.max(0, stored - eMin);
          dischargeKw = Math.min(want, cfg.maxDisKw, (avail * disEff) / DT_H);
          stored -= (dischargeKw / disEff) * DT_H;
          deficit -= dischargeKw;
        }
      }
      stored = clamp(stored, 0, cap);
      const exportKw = cfg.exportAllowed ? surplus : 0;
      const curtailKw = cfg.exportAllowed ? 0 : surplus;
      const importKw = deficit;

      const busIn = directKw + dischargeKw + importKw - loadKw;
      const pvAlloc = directKw + chargeKw + exportKw + curtailKw - pvKw;
      const balanceError = Math.max(Math.abs(busIn), Math.abs(pvAlloc));

      const peakTou = cfg.touEnabled && hour >= 18 && hour < 22;
      const deltaT = cfg.flowKgS > 0 && coolKwT > 0 ? coolKwT / (cfg.flowKgS * 4.186) : 0;
      intervals.push({
        t,
        day: d,
        hour,
        label: days > 1 ? `${date.getUTCDate()}/${date.getUTCMonth() + 1} ${hhmm(t * DT_H)}` : hhmm(t * DT_H),
        irradiance,
        ambient,
        panelTemp,
        pvKw,
        otherLoadKw,
        coolKwT,
        hpKw,
        pumpKw,
        loadKw,
        directKw,
        chargeKw,
        dischargeKw,
        exportKw,
        curtailKw,
        importKw,
        storedKwh: stored,
        soc: cap > 0 ? (stored / cap) * 100 : 0,
        batteryMode: chargeKw > 1e-6 ? "charging" : dischargeKw > 1e-6 ? "discharging" : "idle",
        coolingMode,
        loopIn: cfg.groundTemp + 3 + deltaT * 0.9,
        loopOut: cfg.groundTemp + 3,
        supplyT: cfg.setpoint - 12,
        returnT: cfg.setpoint - 12 + deltaT,
        tariff: peakTou ? cfg.touPeakTariff : cfg.importTariff,
        balanceError,
      });
    }
  }

  const dayTotals = Array.from({ length: days }, (_, d) => ({
    ...totalsOf(intervals.filter((i) => i.day === d), cfg),
    date: new Date(opts.date.getTime() + d * 86400000),
  }));
  const totals = totalsOf(intervals, cfg);
  if (totals.maxBalanceError > 1e-6) issues.push("Energy balance check failed at one or more intervals.");
  return { intervals, totals, dayTotals, issues };
}

export function totalsOf(iv: Interval[], cfg: SimConfig): Totals {
  const s = (f: (i: Interval) => number) => iv.reduce((a, i) => a + f(i), 0) * DT_H;
  const pvKwh = s((i) => i.pvKw);
  const loadKwh = s((i) => i.loadKw);
  const directKwh = s((i) => i.directKw);
  const chargeKwh = s((i) => i.chargeKw);
  const dischargeKwh = s((i) => i.dischargeKw);
  const exportKwh = s((i) => i.exportKw);
  const importKwh = s((i) => i.importKw);
  const coolKwhT = s((i) => i.coolKwT);
  const hpKwh = s((i) => i.hpKw);
  const pumpKwh = s((i) => i.pumpKw);
  const cost = s((i) => i.importKw * i.tariff);
  const exportRevenue = exportKwh * cfg.exportTariff;
  return {
    pvKwh,
    loadKwh,
    directKwh,
    chargeKwh,
    dischargeKwh,
    exportKwh,
    curtailKwh: s((i) => i.curtailKw),
    importKwh,
    coolKwhT,
    hpKwh,
    pumpKwh,
    peakImportKw: iv.reduce((m, i) => Math.max(m, i.importKw), 0),
    cost,
    exportRevenue,
    netCost: cost - exportRevenue,
    emissionsKg: importKwh * cfg.emissionsFactor,
    selfConsumption: pvKwh > 0 ? ((directKwh + chargeKwh) / pvKwh) * 100 : null,
    solarFraction: loadKwh > 0 ? ((directKwh + dischargeKwh) / loadKwh) * 100 : null,
    gridDependency: loadKwh > 0 ? (importKwh / loadKwh) * 100 : null,
    avgCop: hpKwh > 0 ? coolKwhT / hpKwh : null,
    systemCop: hpKwh + pumpKwh > 0 ? coolKwhT / (hpKwh + pumpKwh) : null,
    maxBalanceError: iv.reduce((m, i) => Math.max(m, i.balanceError), 0),
  };
}

export function safeCop(coolKwT: number, elecKw: number): number | null {
  if (!(elecKw > 0) || !(coolKwT >= 0)) return null;
  return coolKwT / elecKw;
}

export function backupHours(storedKwh: number, minKwh: number, disEffPct: number, loadKw: number): number | null {
  if (!(loadKw > 0)) return null;
  return (Math.max(0, storedKwh - minKwh) * (disEffPct / 100)) / loadKw;
}

export function pctChange(base: number, value: number): number | null {
  if (!Number.isFinite(base) || base === 0) return null;
  return ((value - base) / Math.abs(base)) * 100;
}

// ---------- Forecast ----------
export interface ForecastPoint extends Interval {
  pvLow: number;
  pvHigh: number;
  shortage: boolean;
}

export function forecast(cfg: SimConfig, scenario: Scenario, from: Date, startSoc: number, days = 1) {
  const res = simulate({ ...cfg, initialSoc: startSoc }, { scenario, date: from, days });
  const unc = { clear: 0.08, "partly-cloudy": 0.25, cloudy: 0.35, hot: 0.1, "high-demand": 0.15, "low-demand": 0.15 }[scenario];
  const points: ForecastPoint[] = res.intervals.map((i) => ({
    ...i,
    pvLow: Math.max(0, i.pvKw * (1 - unc)),
    pvHigh: Math.min(cfg.pvKwp, i.pvKw * (1 + unc)),
    shortage: i.importKw > 0.5 && (i.soc <= cfg.socMin + 0.5 || i.importKw > cfg.peakThresholdKw),
  }));
  return { points, totals: res.totals, dayTotals: res.dayTotals, uncertainty: unc };
}

export interface Recommendation {
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export function recommend(cfg: SimConfig, pts: ForecastPoint[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const surplusSteps = pts.filter((p) => p.pvKw > p.loadKw);
  const fullAt = pts.find((p) => p.soc >= cfg.socMax - 0.5);
  const exported = pts.reduce((a, p) => a + p.exportKw, 0) * DT_H;
  const shortage = pts.filter((p) => p.shortage);
  const eveningImport = pts.filter((p) => p.hour >= 18 && p.hour < 22).reduce((a, p) => a + p.importKw, 0) * DT_H;
  const maxAmb = Math.max(...pts.map((p) => p.ambient));

  if (surplusSteps.length > 0)
    recs.push({
      title: `Charge the battery between ${surplusSteps[0].label} and ${surplusSteps[surplusSteps.length - 1].label}`,
      reason: `Predicted solar exceeds campus demand in ${surplusSteps.length} intervals; storing it keeps SOC within the ${cfg.socMin}–${cfg.socMax} % limits.`,
      priority: "medium",
    });
  if (fullAt && exported > 50)
    recs.push({
      title: "Shift flexible loads into the midday surplus",
      reason: `The battery is expected to reach its ${cfg.socMax} % limit at ${fullAt.label}, after which about ${exported.toFixed(0)} kWh would be exported. Running flexible loads then uses that energy on site.`,
      priority: "medium",
    });
  if (maxAmb - cfg.setpoint > 6)
    recs.push({
      title: cfg.precool ? "Keep solar-aware pre-cooling enabled" : "Enable pre-cooling before occupancy",
      reason: `Ambient temperature is forecast to reach ${maxAmb.toFixed(1)} °C, ${(maxAmb - cfg.setpoint).toFixed(1)} °C above the setpoint. Pre-cooling lowers the morning cooling peak.`,
      priority: cfg.precool ? "low" : "high",
    });
  if (eveningImport > 100)
    recs.push({
      title: "Preserve battery reserve for the evening peak",
      reason: `About ${eveningImport.toFixed(0)} kWh is expected to be imported between 18:00 and 22:00${cfg.touEnabled ? `, when the tariff is ${cfg.currency}${cfg.touPeakTariff}/kWh` : ""}. Holding charge until then reduces peak-tariff imports.`,
      priority: "high",
    });
  if (shortage.length > 0)
    recs.push({
      title: "Plan for grid fallback during shortage periods",
      reason: `In ${shortage.length} intervals (first at ${shortage[0].label}) modeled solar and battery cannot meet demand, so grid supply is required.`,
      priority: "high",
    });
  if (recs.length === 0)
    recs.push({ title: "No action needed", reason: "Modeled resources cover demand within all limits for this horizon.", priority: "low" });
  return recs;
}

// ---------- Alerts ----------
export type Severity = "critical" | "warning" | "info";
export interface AlertItem {
  id: string;
  type: string;
  severity: Severity;
  time: string;
  subsystem: string;
  explanation: string;
  value: string;
  action: string;
}

export function deriveAlerts(cfg: SimConfig, res: SimResult, fc: ForecastPoint[], dateKey: string): AlertItem[] {
  const out: AlertItem[] = [];
  const add = (a: Omit<AlertItem, "id">) => {
    const id = `${dateKey}:${a.type}`;
    if (!out.some((x) => x.id === id)) out.push({ ...a, id });
  };
  validateConfig(cfg).forEach((m, i) =>
    add({ type: `config-${i}`, severity: "critical", time: "Configuration", subsystem: "Settings", explanation: m, value: "—", action: "Correct the value in System Settings." }),
  );
  if (res.totals.maxBalanceError > 1e-6)
    add({ type: "balance", severity: "critical", time: dateKey, subsystem: "Simulation", explanation: "Electrical bus did not balance.", value: `${res.totals.maxBalanceError.toFixed(4)} kW`, action: "Review configuration inputs." });
  const low = res.intervals.find((i) => cfg.battCapKwh > 0 && i.soc <= cfg.reserveSoc);
  if (low)
    add({ type: "low-soc", severity: low.soc <= cfg.socMin + 0.5 ? "critical" : "warning", time: low.label, subsystem: "Battery", explanation: "Simulated battery SOC fell to or below the reserve level.", value: `${low.soc.toFixed(1)} %`, action: "Increase solar charging or switch to backup-reserve strategy." });
  const peak = res.intervals.reduce((m, i) => (i.importKw > m.importKw ? i : m), res.intervals[0]);
  if (peak && peak.importKw > cfg.peakThresholdKw)
    add({ type: "high-import", severity: "warning", time: peak.label, subsystem: "Grid", explanation: "Grid import exceeded the configured peak threshold.", value: `${peak.importKw.toFixed(0)} kW`, action: "Use peak-demand reduction or shift flexible loads." });
  const daylightPv = res.totals.pvKwh;
  const expected = cfg.pvKwp * 4.5;
  if (cfg.pvKwp > 0 && daylightPv < expected * 0.5)
    add({ type: "low-solar", severity: "info", time: dateKey, subsystem: "Solar", explanation: "Simulated daily solar yield is below 50 % of a typical clear day.", value: `${daylightPv.toFixed(0)} kWh`, action: "Expect higher grid import; preserve battery reserve." });
  const maxCool = res.intervals.reduce((m, i) => (i.coolKwT > m.coolKwT ? i : m), res.intervals[0]);
  if (maxCool && maxCool.coolKwT > cfg.coolCapKwT * 0.85)
    add({ type: "high-cooling", severity: "warning", time: maxCool.label, subsystem: "Geothermal", explanation: "Cooling demand is near the heat-pump capacity.", value: `${maxCool.coolKwT.toFixed(0)} kW_th`, action: "Enable pre-cooling or relax the setpoint." });
  if (cfg.cop < 3)
    add({ type: "low-cop", severity: "warning", time: "Configuration", subsystem: "Geothermal", explanation: "Configured heat-pump COP is low for a ground-source system.", value: `COP ${cfg.cop}`, action: "Check ground-loop assumptions." });
  const sh = fc.find((p) => p.shortage);
  if (sh)
    add({ type: "shortage", severity: "warning", time: `Forecast ${sh.label}`, subsystem: "Prediction", explanation: "Predicted period where solar and battery cannot meet demand.", value: `${sh.importKw.toFixed(0)} kW import`, action: "Pre-charge battery and reduce flexible loads." });
  add({ type: "no-sensors", severity: "info", time: dateKey, subsystem: "Data source", explanation: "No hardware sensors are connected; all values are simulated.", value: "Simulation mode", action: "Connect a data source in settings when available." });
  return out;
}
