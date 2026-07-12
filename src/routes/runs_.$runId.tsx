import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  FileText,
  HelpCircle,
  PlayCircle,
  Wrench,
} from "lucide-react";

import { getAgentRun } from "@/data/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AgentPill } from "@/components/badges";
import { agentLabel, formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgentKind, AgentRun, AgentStep } from "@/data/types";
import { StatusPill } from "./runs";

// -----------------------------------------------------------------------------
// Route
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/runs_/$runId")({
  loader: async ({ params }) => {
    const run = await getAgentRun(params.runId);
    if (!run) throw notFound();
    return { run };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.runId} — Agent trace · Compliance Disco` },
      {
        name: "description",
        content: "Multi-agent trace tree with per-step inputs, reasoning, outputs and handoffs.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: RunNotFound,
  component: RunDetail,
});

function RunNotFound() {
  const { runId } = Route.useParams();
  return (
    <div className="mx-auto max-w-[720px] p-6">
      <Card>
        <CardContent className="p-6 text-sm">
          <div className="text-base font-semibold">Run not found</div>
          <p className="mt-1 text-muted-foreground">
            No agent run matches <code className="font-mono">{runId}</code>.
          </p>
          <Link
            to="/runs"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            ← Back to all runs
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
function RunDetail() {
  const loaderData = Route.useLoaderData() as { run: AgentRun };
  const initialRun = loaderData.run;
  const { runId } = Route.useParams();
  const { data: run = initialRun } = useQuery<AgentRun>({
    queryKey: ["run", runId],
    queryFn: () => getAgentRun(runId).then((x) => x ?? initialRun),
    initialData: initialRun,
  });

  // Derived totals — never trust the run header alone.
  const totalDuration = run.steps.reduce((a, s) => a + s.durationMs, 0);
  const totalTokens = run.steps.reduce((a, s) => a + s.tokens, 0);
  const totalCost = run.steps.reduce((a, s) => a + s.costUsd, 0);
  const totalsMatch =
    totalDuration === run.latencyMs &&
    totalTokens === run.tokens &&
    Math.abs(totalCost - run.costUsd) < 0.01;

  const [selectedId, setSelectedId] = useState<string>(run.steps[0]?.id ?? "");
  const selected = run.steps.find((s) => s.id === selectedId) ?? run.steps[0];

  // Replay animation state
  const [replayIdx, setReplayIdx] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => {
      if (run.status === "escalated") return; // Only replay the success path
      setReplayIdx(-1);
      let i = 0;
      const int = window.setInterval(() => {
        if (i >= run.steps.length) {
          window.clearInterval(int);
          window.setTimeout(() => setReplayIdx(null), 900);
          return;
        }
        setReplayIdx(i);
        setSelectedId(run.steps[i].id);
        i += 1;
      }, 900);
    };
    window.addEventListener("compliance-disco:replay", handler);
    return () => window.removeEventListener("compliance-disco:replay", handler);
  }, [run.status, run.steps]);

  const startLocalReplay = () => {
    window.dispatchEvent(new CustomEvent("compliance-disco:replay"));
  };

  // Agent + status filters on the event timeline
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const filteredEvents = useMemo(
    () =>
      run.events.filter(
        (e) =>
          (filterAgent === "all" || e.agent === filterAgent) &&
          (filterLevel === "all" || e.level === filterLevel),
      ),
    [run.events, filterAgent, filterLevel],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/runs" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All runs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono tabular-nums">{run.id}</span>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono tabular-nums text-xs text-muted-foreground">{run.id}</span>
              <StatusPill status={run.status} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {run.status === "escalated"
                ? "Escalated — Marketing Agent refused to guess"
                : "Full multi-agent pass"}
            </h1>
            <p className="mt-1 max-w-[720px] text-sm text-muted-foreground">{run.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                <span className="text-muted-foreground/70">Started</span>{" "}
                <span className="font-medium text-foreground/80 tabular-nums">
                  {formatDateTime(run.startedAt)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground/70">Completed</span>{" "}
                <span className="font-medium text-foreground/80 tabular-nums">
                  {formatDateTime(run.completedAt)}
                </span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <HeaderStat
              icon={<Clock className="h-4 w-4" />}
              label="Total latency"
              value={formatDuration(totalDuration)}
              note="derived from steps"
            />
            <HeaderStat
              icon={<Cpu className="h-4 w-4" />}
              label="Total tokens"
              value={formatNumber(totalTokens)}
              note="Σ step tokens"
            />
            <HeaderStat
              icon={<Coins className="h-4 w-4" />}
              label="Total cost"
              value={`$${totalCost.toFixed(2)}`}
              note="Σ step cost"
            />
          </div>
        </CardContent>
        {!totalsMatch && (
          <div className="border-t border-status-high/40 bg-status-high/10 px-5 py-2 text-[11px] text-status-high">
            Header totals disagree with the sum of step totals — showing the derived values.
          </div>
        )}
      </Card>

      {/* Trace tree */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Trace tree</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Extractor → Coordinator → (Engineering ∥ Marketing) → Composer. Click a node to inspect
            its inputs, reasoning and output.
          </p>
        </div>
        {run.status === "completed" && (
          <Button size="sm" variant="outline" onClick={startLocalReplay} className="h-8 gap-1">
            <PlayCircle className="h-4 w-4" /> Replay this run
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-6">
          <TraceTree
            run={run}
            selectedId={selected?.id ?? ""}
            onSelect={setSelectedId}
            replayIdx={replayIdx}
          />
        </CardContent>
      </Card>

      {/* Inspector */}
      {selected && <StepInspector step={selected} />}

      {/* Event timeline */}
      <div>
        <h2 className="text-base font-semibold">Run events</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          System log for this run — filter by agent or level.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Agent:</span>
            <FilterChips
              value={filterAgent}
              onChange={setFilterAgent}
              options={[
                { value: "all", label: "All" },
                ...Array.from(new Set(run.events.map((e) => e.agent))).map((a) => ({
                  value: a,
                  label: a,
                })),
              ]}
            />
            <span className="ml-4 text-muted-foreground">Level:</span>
            <FilterChips
              value={filterLevel}
              onChange={setFilterLevel}
              options={[
                { value: "all", label: "All" },
                { value: "info", label: "Info" },
                { value: "warn", label: "Warn" },
                { value: "error", label: "Error" },
                { value: "escalation", label: "Escalation" },
              ]}
            />
          </div>
          {filteredEvents.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">No events match those filters.</div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {filteredEvents.map((e, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "flex flex-wrap items-center gap-2 px-3 py-2 text-xs",
                    e.level === "escalation" && "bg-status-critical/5",
                    e.level === "warn" && "bg-status-high/5",
                    e.level === "error" && "bg-status-critical/5",
                  )}
                >
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatDateTime(e.timestamp).split(", ")[1]}
                  </span>
                  <LevelBadge level={e.level} />
                  <span className="text-muted-foreground">{e.agent}</span>
                  <span className="flex-1 text-foreground/90">{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trace tree — real topology, not a flat list
// -----------------------------------------------------------------------------
interface TreeNode {
  step: AgentStep;
  col: number; // 0..3
  row: number; // vertical slot within a column
}

function layoutTree(run: AgentRun): { nodes: TreeNode[]; cols: number } {
  // Column plan:
  //   0 extractor / any pre-step
  //   1 coordinator
  //   2 engineering + marketing (parallel fan-out)
  //   3 composer
  const nodes: TreeNode[] = [];
  const parallelRows: Record<AgentKind, number> = {
    extractor: 0,
    coordinator: 0,
    engineering: 0,
    marketing: 1,
    composer: 0,
  };
  const colOf: Record<AgentKind, number> = {
    extractor: 0,
    coordinator: 1,
    engineering: 2,
    marketing: 2,
    composer: 3,
  };
  for (const step of run.steps) {
    nodes.push({ step, col: colOf[step.agent], row: parallelRows[step.agent] });
  }
  return { nodes, cols: 4 };
}

const AGENT_ICON: Record<AgentKind, React.ComponentType<{ className?: string }>> = {
  extractor: FileText,
  coordinator: ArrowRight,
  engineering: Wrench,
  marketing: Bot,
  composer: CheckCircle2,
};

function TraceTree({
  run,
  selectedId,
  onSelect,
  replayIdx,
}: {
  run: AgentRun;
  selectedId: string;
  onSelect: (id: string) => void;
  replayIdx: number | null;
}) {
  const { nodes, cols } = layoutTree(run);
  const nodeById = new Map(nodes.map((n) => [n.step.id, n]));

  // Build edges from handoffTo (agent name) — pick the next step of that agent.
  const edges: { from: TreeNode; to: TreeNode }[] = [];
  run.steps.forEach((s, i) => {
    if (!s.handoffTo) return;
    const targets = s.handoffTo.split(/\s*[+,]\s*/g).map((t) => t.trim().toLowerCase());
    for (const t of targets) {
      // find the earliest matching later step
      const target = run.steps
        .slice(i + 1)
        .find((x) => x.agent === (t as AgentKind) || x.agent.startsWith(t));
      if (target) {
        const f = nodeById.get(s.id);
        const tt = nodeById.get(target.id);
        if (f && tt) edges.push({ from: f, to: tt });
      }
    }
  });

  // For replay: which step index each node corresponds to
  const stepIndex = new Map(run.steps.map((s, i) => [s.id, i]));

  const COL_W = 220;
  const ROW_H = 130;
  const rows = Math.max(1, ...nodes.map((n) => n.row + 1));
  const width = cols * COL_W;
  const height = rows * ROW_H + 20;
  const nodeXY = (n: TreeNode) => ({
    x: n.col * COL_W + COL_W / 2,
    y: n.row * ROW_H + ROW_H / 2,
  });

  return (
    <div className="relative" style={{ width, height }} role="tree" aria-label="Agent trace tree">
      {/* SVG connectors */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={width}
        height={height}
        aria-hidden
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = nodeXY(e.from);
          const b = nodeXY(e.to);
          const midX = (a.x + b.x) / 2;
          const path = `M ${a.x + 60} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - 70} ${b.y}`;
          const active =
            replayIdx !== null &&
            (stepIndex.get(e.from.step.id) ?? 0) <= replayIdx &&
            (stepIndex.get(e.to.step.id) ?? 0) <= replayIdx;
          return (
            <path
              key={i}
              d={path}
              className={cn(
                "fill-none transition-[stroke,opacity] duration-500",
                active ? "stroke-primary" : "stroke-muted-foreground/40",
              )}
              strokeWidth={active ? 2 : 1.5}
              markerEnd="url(#arrow)"
            />
          );
        })}
      </svg>
      {/* Nodes */}
      {nodes.map((n) => {
        const idx = stepIndex.get(n.step.id) ?? 0;
        const dimmed = replayIdx !== null && idx > replayIdx;
        const pulsing = replayIdx !== null && idx === replayIdx;
        return (
          <TraceNode
            key={n.step.id}
            step={n.step}
            x={n.col * COL_W + 20}
            y={n.row * ROW_H + 20}
            width={COL_W - 40}
            selected={selectedId === n.step.id}
            onSelect={() => onSelect(n.step.id)}
            dimmed={dimmed}
            pulsing={pulsing}
          />
        );
      })}
      {/* Column labels */}
      <div
        className="pointer-events-none absolute inset-x-0 flex text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        style={{ top: -14 }}
      >
        {["Extract", "Route", "Analyse (parallel)", "Compose"].map((label, i) => (
          <div key={label} style={{ width: COL_W }} className="text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceNode({
  step,
  x,
  y,
  width,
  selected,
  onSelect,
  dimmed,
  pulsing,
}: {
  step: AgentStep;
  x: number;
  y: number;
  width: number;
  selected: boolean;
  onSelect: () => void;
  dimmed: boolean;
  pulsing: boolean;
}) {
  const Icon = AGENT_ICON[step.agent];
  const escalated = step.status === "escalated" || Boolean(step.escalation);
  const agentTone = `border-agent-${step.agent}/40 bg-agent-${step.agent}/10 text-agent-${step.agent}`;
  return (
    <button
      onClick={onSelect}
      style={{ left: x, top: y, width }}
      className={cn(
        "absolute rounded-md border bg-card text-left shadow-sm transition-all",
        selected
          ? "border-primary ring-2 ring-primary/40"
          : escalated
            ? "border-status-critical"
            : "border-border hover:border-primary/50",
        dimmed && "opacity-30",
        pulsing && "animate-pulse ring-4 ring-primary/40",
        escalated && "shadow-status-critical/10",
      )}
      aria-selected={selected}
    >
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", agentTone)}>
          <Icon className="h-3 w-3" />
          {agentLabel[step.agent]}
        </span>
        {escalated ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-status-critical/40 bg-status-critical/10 px-1.5 py-0.5 text-[10px] font-semibold text-status-critical">
            <AlertOctagon className="h-3 w-3" /> Escalated
          </span>
        ) : (
          <span className="ml-auto text-[10px] font-medium tabular-nums text-status-ok">
            <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
            done
          </span>
        )}
      </div>
      <div className="p-2 text-[11px] leading-tight text-foreground/90">
        <div className="flex items-center justify-between tabular-nums text-muted-foreground">
          <span>
            in {step.inputCount} · out {step.outputCount}
          </span>
          <span>{formatDuration(step.durationMs)}</span>
        </div>
        {step.handoffTo && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            → handoff to <span className="font-medium text-foreground/80">{step.handoffTo}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Step inspector
// -----------------------------------------------------------------------------
function StepInspector({ step }: { step: AgentStep }) {
  const escalated = step.status === "escalated" || Boolean(step.escalation);
  return (
    <Card
      className={cn(
        escalated && "border-status-critical/40",
      )}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <AgentPill kind={step.agent} />
          <CardTitle className="text-sm">
            {agentLabel[step.agent]} · step {step.id}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          <span>{formatDuration(step.durationMs)}</span>
          <span>· {formatNumber(step.tokens)} tok</span>
          <span>· ${step.costUsd.toFixed(2)}</span>
          <span>· in {step.inputCount}</span>
          <span>· out {step.outputCount}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {escalated && step.escalation && (
          <div className="lg:col-span-2">
            <div className="rounded-md border-2 border-status-critical/60 bg-status-critical/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-status-critical">
                <AlertOctagon className="h-3.5 w-3.5" /> The agent refused to guess
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {step.escalation.reason}
              </div>
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">Decision required: </span>
                <span className="font-medium text-foreground/90">
                  {step.escalation.decisionRequired}
                </span>
              </div>
              {step.escalation.escalatedTo && (
                <div className="mt-1 text-xs">
                  <span className="text-muted-foreground">Escalated to: </span>
                  <span className="font-medium text-foreground/90">{step.escalation.escalatedTo}</span>
                </div>
              )}
              <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-status-unknown bg-status-unknown/10 px-2 py-0.5 text-[11px] font-semibold text-status-unknown">
                <HelpCircle className="h-3 w-3" /> status = unknown (never a fabricated compliant)
              </div>
            </div>
          </div>
        )}

        <InspectorField label="Input received">
          <JsonBlock value={step.input} />
        </InspectorField>
        <InspectorField label="Output produced">
          <JsonBlock value={step.output} />
        </InspectorField>
        <InspectorField label="Reasoning" className="lg:col-span-2" tint="agent">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {step.reasoning}
          </p>
        </InspectorField>
        <InspectorField label="Tool calls">
          {step.toolCalls.length === 0 ? (
            <span className="text-xs text-muted-foreground">No tool calls.</span>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {step.toolCalls.map((t) => (
                <li key={t} className="font-mono tabular-nums text-foreground/90">
                  <ArrowRight className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </InspectorField>
        <InspectorField label="Source files read">
          {step.sourceFiles.length === 0 ? (
            <span className="text-xs text-muted-foreground">None.</span>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {step.sourceFiles.map((f) => (
                <li key={f} className="font-mono text-foreground/90">
                  <FileText className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </InspectorField>
        {step.handoffTo && (
          <InspectorField label="Handoff" className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Next:</span>
              <span className="rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary">
                {step.handoffTo}
              </span>
            </div>
          </InspectorField>
        )}
      </CardContent>
    </Card>
  );
}

function InspectorField({
  label,
  children,
  className,
  tint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  tint?: "agent";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        tint === "agent" ? "border-primary/20 bg-primary/[0.04]" : "border-border bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide",
          tint === "agent" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {tint === "agent" && <Bot className="h-3 w-3" />}
        {label}
      </div>
      {children}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-foreground/90">
      <code>{text}</code>
    </pre>
  );
}

// -----------------------------------------------------------------------------
// Small UI bits
// -----------------------------------------------------------------------------
function HeaderStat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {note && <div className="text-[10px] text-muted-foreground">{note}</div>}
    </div>
  );
}

function FilterChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
            value === o.value
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    info: "border-border bg-muted text-foreground/80",
    warn: "border-status-high/40 bg-status-high/10 text-status-high",
    error: "border-status-critical/40 bg-status-critical/10 text-status-critical",
    escalation: "border-status-critical/40 bg-status-critical/10 text-status-critical font-semibold",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
        map[level] ?? map.info,
      )}
    >
      {level}
    </span>
  );
}
