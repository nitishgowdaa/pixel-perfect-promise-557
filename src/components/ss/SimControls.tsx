import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCENARIOS, STEPS_PER_DAY, type Scenario } from "@/lib/sim/engine";
import { useSim } from "@/lib/sim/store";

export function SimControls() {
  const s = useSim();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
      <Button size="sm" onClick={() => s.setPlaying(!s.playing)}>
        {s.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {s.playing ? "Pause" : "Start"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => s.setStep((x) => (x + 1) % STEPS_PER_DAY)} aria-label="Step forward 15 minutes">
        <StepForward className="h-4 w-4" /> Step
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          s.setPlaying(false);
          s.setStep(0);
        }}
      >
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
      <Select value={String(s.speed)} onValueChange={(v) => s.setSpeed(Number(v))}>
        <SelectTrigger className="h-8 w-24" aria-label="Speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 4, 8].map((v) => (
            <SelectItem key={v} value={String(v)}>
              {v}× speed
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={s.scenario} onValueChange={(v) => s.setScenario(v as Scenario)}>
        <SelectTrigger className="h-8 w-44" aria-label="Weather scenario">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
            <SelectItem key={k} value={k}>
              {SCENARIOS[k].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex min-w-48 flex-1 items-center gap-3">
        <Slider value={[s.step]} min={0} max={STEPS_PER_DAY - 1} step={1} onValueChange={([v]) => s.setStep(v ?? 0)} aria-label="Time of day" />
        <span className="tabular w-12 text-sm font-medium">{s.current.label}</span>
      </div>
    </div>
  );
}
