import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const steps = [
  { key: "ingested", label: "Regulation ingested" },
  { key: "extracted", label: "Requirements extracted" },
  { key: "mapped", label: "Departments mapped" },
  { key: "analysed", label: "Department analysis" },
  { key: "composed", label: "FDO composed" },
  { key: "signoff", label: "Sign-off complete" },
];

// Motion policy: this component ONLY animates in response to the
// "compliance-disco:replay" event. No decorative animation.
export function PipelineStepper({ current = 4 }: { current?: number }) {
  const [active, setActive] = useState(current);

  useEffect(() => setActive(current), [current]);

  useEffect(() => {
    const handler = () => {
      setActive(0);
      let i = 0;
      const int = window.setInterval(() => {
        i += 1;
        setActive(i);
        if (i >= steps.length - 1) {
          window.clearInterval(int);
          window.setTimeout(() => setActive(current), 800);
        }
      }, 600);
    };
    window.addEventListener("compliance-disco:replay", handler);
    return () => window.removeEventListener("compliance-disco:replay", handler);
  }, [current]);

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Pipeline progress">
      {steps.map((s, i) => {
        const done = i < active;
        const isCurrent = i === active;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                done && "border-status-ok/40 bg-status-ok/10 text-status-ok",
                isCurrent && "border-primary/40 bg-primary/10 text-primary",
                !done && !isCurrent && "border-border bg-background text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border tabular-nums">
                {done ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
