import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSim } from "@/lib/sim/store";
import type { SimConfig } from "@/lib/sim/engine";

type NumKey = { [K in keyof SimConfig]: SimConfig[K] extends number ? K : never }[keyof SimConfig];
type BoolKey = { [K in keyof SimConfig]: SimConfig[K] extends boolean ? K : never }[keyof SimConfig];
type StrKey = { [K in keyof SimConfig]: SimConfig[K] extends string ? K : never }[keyof SimConfig];

export function NumField({ k, label, unit, min, max, step = 1, help }: { k: NumKey; label: string; unit?: string; min?: number; max?: number; step?: number; help?: string }) {
  const { config, updateConfig } = useSim();
  const [v, setV] = useState(String(config[k]));
  useEffect(() => setV(String(config[k])), [config, k]);
  const n = Number(v);
  const err = v.trim() === "" || !Number.isFinite(n) ? "Enter a number" : min != null && n < min ? `Min ${min}` : max != null && n > max ? `Max ${max}` : null;
  return (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-xs">
        {label} {unit && <span className="text-muted-foreground">({unit})</span>}
      </Label>
      <Input
        id={k}
        type="number"
        step={step}
        value={v}
        aria-invalid={!!err}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (!err) updateConfig({ [k]: n } as Partial<SimConfig>);
        }}
      />
      {err ? <p className="text-[11px] text-destructive">{err}</p> : help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

export function TextField({ k, label }: { k: StrKey; label: string }) {
  const { config, updateConfig } = useSim();
  const [v, setV] = useState(String(config[k]));
  useEffect(() => setV(String(config[k])), [config, k]);
  return (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-xs">{label}</Label>
      <Input id={k} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() && updateConfig({ [k]: v.trim() } as Partial<SimConfig>)} />
    </div>
  );
}

export function BoolField({ k, label, help }: { k: BoolKey; label: string; help?: string }) {
  const { config, updateConfig } = useSim();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div>
        <Label htmlFor={k} className="text-xs">{label}</Label>
        {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
      </div>
      <Switch id={k} checked={config[k]} onCheckedChange={(c) => updateConfig({ [k]: c } as Partial<SimConfig>)} />
    </div>
  );
}
