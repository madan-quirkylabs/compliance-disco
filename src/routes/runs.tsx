import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
} from "lucide-react";

import { getAgentRuns } from "@/data/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentPill } from "@/components/badges";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/data/types";

export const Route = createFileRoute("/runs")({
  head: () => ({
    meta: [
      { title: "Agent Runs — Compliance Disco" },
      {
        name: "description",
        content: "Traces of every multi-agent run: who called whom, in what order, with status, duration and cost.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunsList,
});

function RunsList() {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: getAgentRuns,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every trace is inspectable — pick a run to see the topology, per-step reasoning, and
          escalations.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {runs.map((r) => (
            <li key={r.id}>
              <RunCard run={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RunCard({ run }: { run: AgentRun }) {
  const escalated = run.status === "escalated";
  const agents = Array.from(new Set(run.steps.map((s) => s.agent)));
  return (
    <Link to="/runs/$runId" params={{ runId: run.id }} className="block">
      <Card
        className={cn(
          "h-full transition-colors hover:border-primary/50",
          escalated && "border-status-critical/40",
        )}
      >
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="font-mono tabular-nums text-sm">{run.id}</CardTitle>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {formatDateTime(run.startedAt)} · {formatDuration(run.latencyMs)} elapsed
            </div>
          </div>
          <StatusPill status={run.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground/90">{run.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            {agents.map((a) => (
              <AgentPill key={a} kind={a} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
            <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Latency" value={formatDuration(run.latencyMs)} />
            <Stat icon={<Cpu className="h-3.5 w-3.5" />} label="Tokens" value={formatNumber(run.tokens)} />
            <Stat
              icon={<Coins className="h-3.5 w-3.5" />}
              label="Cost"
              value={`$${run.costUsd.toFixed(2)}`}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              {run.steps.length} steps · {run.events.length} events
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              Open trace <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-medium tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: AgentRun["status"] }) {
  const map = {
    completed: {
      cls: "border-status-ok/40 bg-status-ok/10 text-status-ok",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Completed",
    },
    escalated: {
      cls: "border-status-critical/40 bg-status-critical/10 text-status-critical",
      icon: <AlertOctagon className="h-3.5 w-3.5" />,
      label: "Escalated to human",
    },
    running: {
      cls: "border-primary/40 bg-primary/10 text-primary",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Running",
    },
    failed: {
      cls: "border-status-critical/40 bg-status-critical/10 text-status-critical",
      icon: <AlertOctagon className="h-3.5 w-3.5" />,
      label: "Failed",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        m.cls,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}
