import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  HelpCircle,
} from "lucide-react";

import { getAgentRuns, getComplianceItems } from "@/data/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineStepper } from "@/components/PipelineStepper";
import { ProgressRing } from "@/components/ProgressRing";
import {
  AgentPill,
  DepartmentBadge,
  HumanChip,
  RiskBadge,
  SignoffBadge,
} from "@/components/badges";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import type { ComplianceItem, Risk } from "@/data/types";
import { useViewMode, viewModeLabel } from "@/lib/view-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — Compliance Disco" },
      {
        name: "description",
        content:
          "DPDP readiness, KPIs, pipeline stage, blockers, and the latest agent run at a glance.",
      },
    ],
  }),
  component: CommandCenter,
});

function isSignedOff(i: ComplianceItem): boolean {
  return i.status === "signed_off" || i.status === "implemented" || i.status === "in_fdo";
}

function isAwaitingReview(i: ComplianceItem): boolean {
  return i.impacts.some((im) => im.signoff !== "approved");
}

function hasEscalation(i: ComplianceItem): boolean {
  return i.impacts.some((im) => Boolean(im.escalation)) ||
    i.impacts.some((im) => im.assessmentStatus === "unknown");
}

function CommandCenter() {
  const { mode } = useViewMode();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["items"],
    queryFn: getComplianceItems,
  });
  const { data: runs = [] } = useQuery({ queryKey: ["runs"], queryFn: getAgentRuns });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] p-6" aria-busy>
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[900px] p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-status-critical">
              <AlertOctagon className="h-4 w-4" />
              <span className="font-medium">Failed to load compliance data.</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This screen reads through the adapter — retry once the fixture layer is reachable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalItems = items.length;
  const highRiskCount = items.filter((i) => i.risk === "high" || i.risk === "critical").length;
  const departmentsImpacted = new Set(items.flatMap((i) => i.departments)).size;
  const awaitingCount = items.filter((i) => !isSignedOff(i) && isAwaitingReview(i)).length;
  const signedOffCount = items.filter(isSignedOff).length;
  const readiness = totalItems ? Math.round((signedOffCount / totalItems) * 100) : 0;

  const riskCounts: Record<Risk, number> = {
    critical: items.filter((i) => i.risk === "critical").length,
    high: items.filter((i) => i.risk === "high").length,
    medium: items.filter((i) => i.risk === "medium").length,
    low: items.filter((i) => i.risk === "low").length,
  };

  const engItems = items.filter((i) => i.departments.includes("engineering"));
  const mktItems = items.filter((i) => i.departments.includes("marketing"));

  // "Needs attention" = escalations first, then critical/high without sign-off.
  const escalated = items.filter(hasEscalation);
  const openHighRisk = items.filter(
    (i) => !isSignedOff(i) && (i.risk === "critical" || i.risk === "high") && !hasEscalation(i),
  );
  const blockers = [...escalated, ...openHighRisk].slice(0, 6);

  const recent = items
    .flatMap((i) => i.activity.map((a) => ({ item: i, event: a })))
    .sort((a, b) => (a.event.timestamp < b.event.timestamp ? 1 : -1))
    .slice(0, 6);

  const latestRun = runs[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DPDP Compliance Readiness</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Regulation ingested, {totalItems} requirements analysed by 5 agents across 2 departments.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Viewing as <span className="font-medium text-foreground">{viewModeLabel[mode]}</span>.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <ProgressRing value={readiness} label="Ready" sublabel={`${signedOffCount}/${totalItems} items`} />
            <div className="text-xs">
              <div className="text-sm font-medium text-foreground">Overall readiness</div>
              <div className="mt-1 text-muted-foreground">Signed off or implemented</div>
              <div className="mt-2 flex items-center gap-2 text-status-ok">
                <CheckCircle2 className="h-3.5 w-3.5" /> {signedOffCount} signed off
              </div>
              <div className="flex items-center gap-2 text-status-high">
                <AlertOctagon className="h-3.5 w-3.5" /> {awaitingCount} awaiting review
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs — each deep-links to a filtered /compliance view */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi to="/compliance" label="Compliance points" value={totalItems} hint="extracted from the DPDP Act" />
        <Kpi
          to="/compliance"
          toSearch={{ preset: "high" }}
          label="High-priority items"
          value={highRiskCount}
          hint="critical + high risk"
        />
        <Kpi label="Departments impacted" value={departmentsImpacted} hint="Engineering, Marketing" />
        <Kpi
          to="/compliance"
          toSearch={{ preset: "awaiting" }}
          label="Awaiting human review"
          value={awaitingCount}
          hint="pending sign-off"
        />
        <Kpi
          to="/compliance"
          toSearch={{ signoff: ["approved"] }}
          label="Signed off"
          value={signedOffCount}
          hint="approved or implemented"
        />
      </div>

      {/* Pipeline stepper */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineStepper current={4} />
        </CardContent>
      </Card>

      {/* Risk breakdown + department readiness */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Risk breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["critical", "high", "medium", "low"] as Risk[]).map((r) => {
              const count = riskCounts[r];
              const pct = totalItems ? (count / totalItems) * 100 : 0;
              const bar =
                r === "critical"
                  ? "bg-status-critical"
                  : r === "high"
                    ? "bg-status-high"
                    : r === "medium"
                      ? "bg-muted-foreground/50"
                      : "bg-muted-foreground/30";
              return (
                <Link
                  key={r}
                  to="/compliance"
                  search={() => ({ risk: [r] }) as never}
                  className="block rounded-md p-2 text-xs hover:bg-muted"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <RiskBadge value={r} />
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                    <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Department readiness
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DeptCard name="Engineering" items={engItems} to="/departments/engineering" />
            <DeptCard name="Marketing" items={mktItems} to="/departments/marketing" />
          </div>
        </div>
      </div>

      {/* Needs attention + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {blockers.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nothing outstanding.</div>
            ) : (
              <ul className="divide-y divide-border">
                {blockers.map((b) => {
                  const escalation = b.impacts.find((im) => im.escalation)?.escalation;
                  const unknown = b.impacts.find((im) => im.assessmentStatus === "unknown");
                  return (
                    <li key={b.id}>
                      <Link
                        to="/compliance/$itemId"
                        params={{ itemId: b.id }}
                        className="flex items-start gap-3 p-3 hover:bg-muted/60"
                      >
                        <RiskBadge value={b.risk} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{b.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="tabular-nums">{b.id}</span>
                            {b.source && <span>· {b.source.section}</span>}
                            <span>· owner: {b.owner ?? "unassigned"}</span>
                          </div>
                          {escalation && (
                            <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-md border border-status-critical/40 bg-status-critical/5 px-2 py-1 text-xs text-status-critical">
                              <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>
                                <span className="font-semibold">Escalation · </span>
                                {escalation.decisionRequired}
                              </span>
                            </div>
                          )}
                          {!escalation && unknown && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-status-unknown bg-status-unknown/10 px-2 py-1 text-xs font-semibold text-status-unknown">
                              <HelpCircle className="h-3.5 w-3.5" />
                              Unknown — evidence missing
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex flex-wrap justify-end gap-1">
                            {b.departments.map((d) => (
                              <DepartmentBadge key={d} value={d} />
                            ))}
                          </div>
                          {b.impacts[0] && <SignoffBadge value={b.impacts[0].signoff} />}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent agent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3">
            {recent.map(({ event, item }) => (
              <Link
                key={item.id + event.id}
                to="/compliance/$itemId"
                params={{ itemId: item.id }}
                className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
              >
                {event.actorType === "agent" && event.agentKind ? (
                  <AgentPill kind={event.agentKind} />
                ) : (
                  <HumanChip name={event.actor.split(" (")[0]} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{event.action}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {item.id} · {formatRelative(event.timestamp)}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Latest run summary */}
      {latestRun && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Latest run · {latestRun.id}</CardTitle>
            <Link
              to="/runs/$runId"
              params={{ runId: latestRun.id }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open trace →
            </Link>

          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <Info label="Status" node={<StatusPill status={latestRun.status} />} />
            <Info
              label="Duration"
              node={
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {formatDuration(latestRun.latencyMs)}
                </span>
              }
            />
            <Info
              label="Agents involved"
              node={
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(latestRun.steps.map((s) => s.agent))).map((k) => (
                    <AgentPill key={k} kind={k} />
                  ))}
                </div>
              }
            />
            <Info
              label="Estimated cost"
              node={
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Coins className="h-4 w-4 text-muted-foreground" aria-hidden />
                  ${latestRun.costUsd.toFixed(2)} · {formatNumber(latestRun.tokens)} tok
                </span>
              }
            />
            <div className="md:col-span-4">
              <p className="text-sm text-foreground/80">{latestRun.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
        <Bot className="mr-1 inline h-3 w-3" aria-hidden /> Agent-generated content is tinted and labelled with a
        confidence chip. Human decisions appear on plain surfaces with a named person and timestamp.
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  to,
  toSearch,
}: {
  label: string;
  value: number | string;
  hint?: string;
  to?: string;
  toSearch?: Record<string, unknown>;
}) {
  const body = (
    <Card className="h-full transition-colors hover:border-primary/50">
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
  if (!to) return body;
  return (
    <Link to={to} search={toSearch ? (() => toSearch) : undefined as never}>
      {body}
    </Link>
  );
}

function DeptCard({
  name,
  items,
  to,
}: {
  name: string;
  items: ComplianceItem[];
  to: string;
}) {
  const done = items.filter(isSignedOff).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const highRisk = items.filter((i) => i.risk === "high" || i.risk === "critical").length;
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-4 p-4">
          <ProgressRing value={pct} size={72} stroke={8} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{name}</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="mt-1 text-xs tabular-nums text-muted-foreground">
              {items.length} applicable · {done} signed off · {items.length - done} outstanding
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{highRisk} high-priority</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Info({ label, node }: { label: string; node: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{node}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "border-status-ok/40 bg-status-ok/10 text-status-ok",
    escalated: "border-status-critical/40 bg-status-critical/10 text-status-critical",
    running: "border-primary/40 bg-primary/10 text-primary",
    failed: "border-status-critical/40 bg-status-critical/10 text-status-critical",
  };
  const cls = map[status] ?? "border-border bg-muted text-foreground/80";
  const Icon = status === "completed" ? CheckCircle2 : AlertOctagon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {status}
    </span>
  );
}
