import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileText,
  HelpCircle,
  MessageSquareWarning,
  ShieldQuestion,
  User,
} from "lucide-react";

import {
  appendHumanAction,
  clearPracticeDecision,
  getComplianceItems,
  getPracticeDecisions,
  getPracticeRecords,
  setDepartmentSignoff,
  setItemStatus,
  setPracticeDecision,
  type PracticeDecision,
  type PracticeDecisionRecord,
} from "@/data/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AgentPill,
  AssessmentBadge,
  ConfidenceChip,
  DepartmentBadge,
  HumanChip,
  RiskBadge,
  SignoffBadge,
  StatusBadge,
} from "@/components/badges";
import { ProgressRing } from "@/components/ProgressRing";
import { cn } from "@/lib/utils";
import {
  assessmentLabel,
  departmentLabel,
  formatDateTime,
  formatRelative,
} from "@/lib/format";
import type {
  ActivityEvent,
  ComplianceItem,
  Department,
  DepartmentImpact,
  PracticeRecord,
} from "@/data/types";

// -----------------------------------------------------------------------------
// Route
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/departments/$dept")({
  loader: ({ params }) => {
    if (params.dept !== "engineering" && params.dept !== "marketing") throw notFound();
    return { dept: params.dept as Department };
  },
  head: ({ params }) => {
    const label = params.dept === "engineering" ? "Engineering" : "Marketing";
    return {
      meta: [
        { title: `${label} workspace — Compliance Disco` },
        {
          name: "description",
          content: `${label}'s DPDP-scoped compliance actions, readiness score, sign-offs, and activity.`,
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <Card>
        <CardContent className="p-6 text-sm">
          <div className="text-base font-semibold">Unknown department</div>
          <p className="mt-1 text-muted-foreground">
            Only <code className="font-mono">engineering</code> and{" "}
            <code className="font-mono">marketing</code> workspaces exist in this build.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            ← Back to Command Center
          </Link>
        </CardContent>
      </Card>
    </div>
  ),
  component: DeptWorkspace,
});

// -----------------------------------------------------------------------------
// Vocabulary — the workspace reads in the department's own words.
// Same underlying assessment, department-specific framing.
// -----------------------------------------------------------------------------
const vocab = {
  engineering: {
    heading: "Engineering",
    subheading: "Databases, jobs, access controls, and logs owned by Engineering.",
    scoreCopy: (pct: number, applicable: number, done: number) =>
      pct >= 80
        ? `Engineering is on track — ${done} of ${applicable} controls signed off with evidence.`
        : pct >= 50
          ? `Engineering is mid-way — ${applicable - done} controls still need code, jobs or logs shipped and evidenced.`
          : `Engineering is behind — most controls still need implementation work and evidence on file.`,
    interpretationLabel: "Legal requirement (engineering read)",
    gapLabel: "Control gap",
    actionsLabel: "Required engineering work",
    evidenceLabel: "Evidence / deliverable",
    itemsCopy: "Requirements routed to Engineering.",
  },
  marketing: {
    heading: "Marketing",
    subheading: "Audiences, consent, channels, and campaign workflows owned by Marketing.",
    scoreCopy: (pct: number, applicable: number, done: number) =>
      pct >= 80
        ? `Marketing is on track — ${done} of ${applicable} obligations signed off with consent evidence.`
        : pct >= 50
          ? `Marketing is mid-way — ${applicable - done} obligations still need consent evidence, gated workflows, or purpose scoping.`
          : `Marketing is behind — most obligations still lack consent evidence or a gated workflow.`,
    interpretationLabel: "Legal requirement (marketing read)",
    gapLabel: "Marketing gap",
    actionsLabel: "Required marketing change",
    evidenceLabel: "Completion evidence",
    itemsCopy: "Requirements routed to Marketing.",
  },
} as const;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function isSignedOff(i: ComplianceItem): boolean {
  return i.status === "signed_off" || i.status === "implemented" || i.status === "in_fdo";
}

function impactOf(item: ComplianceItem, dept: Department): DepartmentImpact | undefined {
  return item.impacts.find((im) => im.department === dept);
}

function riskWeight(r: ComplianceItem["risk"]): number {
  return r === "critical" ? 4 : r === "high" ? 3 : r === "medium" ? 2 : 1;
}

function actorFor(dept: Department): string {
  return dept === "engineering"
    ? "Arjun Rao (Engineering Lead)"
    : "Priya Nair (Marketing Lead)";
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
function DeptWorkspace() {
  const { dept } = Route.useLoaderData() as { dept: Department };
  const v = vocab[dept];
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: getComplianceItems,
  });
  const { data: practices = [] } = useQuery({
    queryKey: ["practices"],
    queryFn: getPracticeRecords,
    enabled: dept === "marketing",
  });
  const { data: practiceDecisions = {} } = useQuery({
    queryKey: ["practice-decisions"],
    queryFn: getPracticeDecisions,
    enabled: dept === "marketing",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["practice-decisions"] });
  };

  // Scoped, derived data
  const scoped = useMemo(
    () => items.filter((i) => i.departments.includes(dept)),
    [items, dept],
  );

  const applicable = scoped.length;
  const highRisk = scoped.filter((i) => i.risk === "high" || i.risk === "critical").length;
  const signedOff = scoped.filter(isSignedOff).length;
  const awaitingResponse = scoped.filter(
    (i) => impactOf(i, dept)?.signoff !== "approved",
  ).length;
  const readinessPct = applicable ? Math.round((signedOff / applicable) * 100) : 0;

  const priorityItems = useMemo(
    () =>
      [...scoped]
        .filter((i) => {
          const im = impactOf(i, dept);
          return !isSignedOff(i) && im && im.assessmentStatus !== "compliant";
        })
        .sort((a, b) => {
          const rw = riskWeight(b.risk) - riskWeight(a.risk);
          if (rw !== 0) return rw;
          const ad = impactOf(a, dept)?.dueDate ?? "9999";
          const bd = impactOf(b, dept)?.dueDate ?? "9999";
          return ad.localeCompare(bd);
        })
        .slice(0, 6),
    [scoped, dept],
  );

  const awaitingSignoff = useMemo(
    () =>
      scoped.filter((i) => {
        const im = impactOf(i, dept);
        return im && im.signoff !== "approved";
      }),
    [scoped, dept],
  );

  const activity = useMemo(() => {
    const events: { item: ComplianceItem; event: ActivityEvent }[] = [];
    for (const i of scoped) {
      for (const e of i.activity) {
        // Scope to this department: agent kind matches OR human whose title
        // clearly belongs to the department, OR events on items only assigned
        // to this department.
        const isDeptAgent = e.agentKind === dept;
        const singleDept = i.departments.length === 1 && i.departments[0] === dept;
        const isNeutralAgent =
          e.actorType === "agent" &&
          e.agentKind &&
          ["extractor", "coordinator", "composer"].includes(e.agentKind);
        if (isDeptAgent || singleDept || (isNeutralAgent && singleDept)) {
          events.push({ item: i, event: e });
        }
      }
    }
    return events.sort((a, b) => (a.event.timestamp < b.event.timestamp ? 1 : -1)).slice(0, 12);
  }, [scoped, dept]);

  // -------- Actions -------------------------------------------------------
  const approveItem = async (item: ComplianceItem) => {
    await setDepartmentSignoff({ itemId: item.id, department: dept, signoff: "approved" });
    if (item.impacts.every((im) => (im.department === dept ? true : im.signoff === "approved"))) {
      await setItemStatus({ itemId: item.id, status: "signed_off" });
    }
    await appendHumanAction({
      itemId: item.id,
      actor: actorFor(dept),
      action: `Approved ${departmentLabel[dept].toLowerCase()} assessment`,
      summary: "Signed off on the department's impact assessment.",
    });
    invalidate();
    toast.success(`Signed off ${item.id}`);
  };

  const requestChanges = async (item: ComplianceItem) => {
    await setDepartmentSignoff({
      itemId: item.id,
      department: dept,
      signoff: "changes_requested",
    });
    await appendHumanAction({
      itemId: item.id,
      actor: actorFor(dept),
      action: "Requested changes",
      summary: "Sent back to the department agent for a revised assessment.",
    });
    invalidate();
    toast.warning(`Changes requested on ${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] p-6" aria-busy>
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      {/* ------------------- Header ------------------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Command Center
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Departments</span>
            <ChevronRight className="h-3 w-3" />
            <DepartmentBadge value={dept} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{v.heading} workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">{v.subheading}</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <ProgressRing
              value={readinessPct}
              label="Ready"
              sublabel={`${signedOff}/${applicable} items`}
            />
            <div className="max-w-[280px] text-xs">
              <div className="text-sm font-medium text-foreground">Department readiness</div>
              <p className="mt-1 text-muted-foreground">
                {v.scoreCopy(readinessPct, applicable, signedOff)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------- KPI counts ------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Applicable requirements" value={applicable} hint={v.itemsCopy} />
        <Kpi
          label="High risk"
          value={highRisk}
          hint="critical + high"
          tone={highRisk > 0 ? "high" : undefined}
        />
        <Kpi
          label="Awaiting response"
          value={awaitingResponse}
          hint="pending or changes requested"
          tone={awaitingResponse > 0 ? "warn" : undefined}
        />
        <Kpi label="Signed off" value={signedOff} hint="approved by this department" tone="ok" />
      </div>

      {/* ------------------- CCO escalation card (Marketing only, MKT-EMAIL-01) ------------------- */}
      {dept === "marketing" && (
        <CcoEscalationSection
          practices={practices}
          items={scoped}
          decisions={practiceDecisions}
          onDecide={invalidate}
        />
      )}

      {/* ------------------- Priority actions ------------------- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Priority actions</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Ordered by risk, then due date
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {priorityItems.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No open priority actions — everything routed to {v.heading} is compliant or signed
              off.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {priorityItems.map((i) => {
                const im = impactOf(i, dept)!;
                return (
                  <li key={i.id}>
                    <Link
                      to="/compliance/$itemId"
                      params={{ itemId: i.id }}
                      className="flex items-start gap-3 p-3 hover:bg-muted/60"
                    >
                      <RiskBadge value={i.risk} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{i.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono tabular-nums">{i.id}</span>
                          {i.source && <span>· {i.source.section}</span>}
                          <span>· owner: {im.owner}</span>
                          <span>· due {im.dueDate}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <AssessmentBadge value={im.assessmentStatus} />
                        <SignoffBadge value={im.signoff} />
                      </div>
                      <ArrowRight
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ------------------- Compliance item cards (dept vocabulary) ------------------- */}
      <SectionTitle title={`${v.heading} compliance items`} sub={v.itemsCopy} />
      <div className="grid gap-4 lg:grid-cols-2">
        {scoped.map((i) => {
          const im = impactOf(i, dept);
          if (!im) return null;
          return (
            <DeptItemCard
              key={i.id}
              item={i}
              impact={im}
              dept={dept}
              onApprove={() => approveItem(i)}
              onRequestChanges={() => requestChanges(i)}
            />
          );
        })}
      </div>

      {/* ------------------- Marketing: downward instructions ------------------- */}
      {dept === "marketing" && (
        <>
          <SectionTitle
            title="Downward marketing instructions"
            sub="Direct, imperative checklists the marketing team can work through. Same underlying assessment as the CCO view — rendered for a different audience."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {scoped
              .map((i) => ({ i, im: impactOf(i, "marketing") }))
              .filter(
                (x) =>
                  x.im &&
                  (x.im.assessmentStatus === "non_compliant" ||
                    x.im.assessmentStatus === "unknown" ||
                    x.im.assessmentStatus === "partial"),
              )
              .map(({ i, im }) => (
                <DownwardInstruction key={i.id} item={i} impact={im!} />
              ))}
          </div>
        </>
      )}

      {/* ------------------- Awaiting sign-off panel ------------------- */}
      <SectionTitle
        title="Awaiting sign-off"
        sub={`What ${v.heading} owes the CCO. Sign off inline, or open the item for full context.`}
      />
      <Card>
        <CardContent className="p-0">
          {awaitingSignoff.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Nothing outstanding — every {v.heading} assessment is approved.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {awaitingSignoff.map((i) => {
                const im = impactOf(i, dept)!;
                return (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/compliance/$itemId"
                        params={{ itemId: i.id }}
                        className="text-sm font-medium hover:underline"
                      >
                        {i.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono tabular-nums">{i.id}</span>
                        <span>· owner: {im.owner}</span>
                        <span>· due {im.dueDate}</span>
                      </div>
                    </div>
                    <AssessmentBadge value={im.assessmentStatus} />
                    <SignoffBadge value={im.signoff} />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => requestChanges(i)}
                      >
                        Request changes
                      </Button>
                      <Button size="sm" className="h-8" onClick={() => approveItem(i)}>
                        Approve
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ------------------- Marketing: practice knowledge base ------------------- */}
      {dept === "marketing" && (
        <>
          <SectionTitle
            title="Marketing practice knowledge base"
            sub="The source-of-truth register the Marketing Agent scores against. Missing consent evidence or stale verification blocks compliance — the agent surfaces these instead of guessing."
          />
          <PracticeTable practices={practices} items={scoped} />
        </>
      )}

      {/* ------------------- Activity timeline ------------------- */}
      <SectionTitle
        title={`${v.heading} activity`}
        sub="Agent and human events scoped to this department, newest first."
      />
      <Card>
        <CardContent className="space-y-1 p-3">
          {activity.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No department activity recorded.
            </div>
          ) : (
            activity.map(({ item, event }) => (
              <div
                key={item.id + event.id}
                className={cn(
                  "flex items-start gap-3 rounded-md p-2",
                  event.actorType === "agent"
                    ? "bg-primary/[0.03]"
                    : "border border-border/60",
                )}
              >
                {event.actorType === "agent" && event.agentKind ? (
                  <AgentPill kind={event.agentKind} />
                ) : (
                  <HumanChip name={event.actor.split(" (")[0]} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{event.action}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    <Link
                      to="/compliance/$itemId"
                      params={{ itemId: item.id }}
                      className="hover:underline"
                    >
                      {item.id}
                    </Link>{" "}
                    · {event.summary || "—"} · {formatRelative(event.timestamp)}
                  </div>
                </div>
                {event.actorType === "agent" && typeof event.confidence === "number" && (
                  <ConfidenceChip value={event.confidence} />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------
function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "ok" | "warn" | "high" | "critical";
}) {
  const toneCls =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
        ? "text-status-high"
        : tone === "high"
          ? "text-status-high"
          : tone === "critical"
            ? "text-status-critical"
            : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", toneCls)}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DeptItemCard({
  item,
  impact,
  dept,
  onApprove,
  onRequestChanges,
}: {
  item: ComplianceItem;
  impact: DepartmentImpact;
  dept: Department;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const v = vocab[dept];
  const isUnknown = impact.assessmentStatus === "unknown";

  return (
    <Card
      className={cn(
        "flex flex-col",
        isUnknown &&
          "border-dashed border-status-unknown/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,color-mix(in_oklab,var(--color-status-unknown)_10%,transparent)_6px,color-mix(in_oklab,var(--color-status-unknown)_10%,transparent)_12px)]",
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <RiskBadge value={item.risk} />
          <StatusBadge value={item.status} />
          <div className="ml-auto">
            <AssessmentBadge value={impact.assessmentStatus} />
          </div>
        </div>
        <div>
          <Link
            to="/compliance/$itemId"
            params={{ itemId: item.id }}
            className="font-medium hover:underline"
          >
            {item.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono tabular-nums">{item.id}</span>
            {item.source && <span>· {item.source.section}</span>}
          </div>
        </div>

        <Field label={v.interpretationLabel} tint="agent">
          <div className="mb-1 flex items-center gap-2">
            <ConfidenceChip value={impact.confidence} />
          </div>
          {impact.interpretation}
        </Field>

        <Field label="Observed current practice">{impact.currentState}</Field>

        <Field label={v.gapLabel} tone={isUnknown ? "unknown" : "warn"}>
          {impact.gap}
        </Field>

        <Field label={v.actionsLabel}>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {impact.requiredActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Field>

        <Field label={v.evidenceLabel}>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {impact.evidenceRequired.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Field>

        {impact.citedPracticeIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Cites practice records:</span>
            {impact.citedPracticeIds.map((pid) => (
              <a
                key={pid}
                href={`#${pid}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono tabular-nums hover:border-primary/50 hover:text-primary"
              >
                <Database className="h-3 w-3" />
                {pid}
              </a>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{impact.owner}</span>
            <span className="text-muted-foreground">· due {impact.dueDate}</span>
          </div>
          <SignoffBadge value={impact.signoff} />
        </div>

        {impact.signoff !== "approved" && (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" className="h-8" onClick={onRequestChanges}>
              <MessageSquareWarning className="h-3.5 w-3.5" /> Request changes
            </Button>
            <Button size="sm" className="h-8" onClick={onApprove}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  tint,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tint?: "agent";
  tone?: "warn" | "unknown";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 text-xs leading-relaxed",
        tint === "agent"
          ? "border-primary/20 bg-primary/[0.04]"
          : tone === "unknown"
            ? "border-dashed border-status-unknown/60 bg-status-unknown/5"
            : tone === "warn"
              ? "border-status-high/30 bg-status-high/5"
              : "border-border bg-background",
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
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Marketing-only: downward instruction card
// -----------------------------------------------------------------------------
function DownwardInstruction({
  item,
  impact,
}: {
  item: ComplianceItem;
  impact: DepartmentImpact;
}) {
  const isUnknown = impact.assessmentStatus === "unknown";
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const totalSteps = impact.requiredActions.length;
  const doneSteps = Object.values(checked).filter(Boolean).length;

  return (
    <Card className="border-l-4 border-l-agent-marketing">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-agent-marketing">
              Instruction for the marketing team · {assessmentLabel[impact.assessmentStatus]}
            </div>
            <div className="mt-1 text-sm font-semibold">{item.title}</div>
            <div className="text-[11px] text-muted-foreground">
              <Link
                to="/compliance/$itemId"
                params={{ itemId: item.id }}
                className="hover:underline"
              >
                {item.id}
              </Link>{" "}
              {item.source && <>· {item.source.section}</>}
            </div>
          </div>
          {isUnknown && (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-status-unknown bg-status-unknown/10 px-2 py-0.5 text-[11px] font-semibold text-status-unknown">
              <HelpCircle className="h-3 w-3" /> Unknown — verify before acting
            </span>
          )}
        </div>

        <div className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed">
          <span className="font-semibold">Before you act on this workflow:</span>{" "}
          {impact.gap} {impact.requiredActions[0]?.replace(/\.$/, "")}. Do not proceed without
          the completion evidence listed below.
        </div>

        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Checklist ({doneSteps}/{totalSteps})
          </div>
          <ul className="space-y-1">
            {impact.requiredActions.map((a, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 rounded-md p-1 text-xs hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={(e) =>
                      setChecked((s) => ({ ...s, [i]: e.target.checked }))
                    }
                    className="mt-0.5 h-3.5 w-3.5 accent-primary"
                  />
                  <span className={cn(checked[i] && "text-muted-foreground line-through")}>{a}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/40 p-2 text-[11px]">
          <div>
            <dt className="text-muted-foreground">Affected workflow</dt>
            <dd className="font-medium">{item.applicabilityRationale.split(".")[0]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">{impact.owner}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Timing</dt>
            <dd className="font-medium tabular-nums">By {impact.dueDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Escalation contact</dt>
            <dd className="font-medium">
              {impact.escalation?.escalatedTo ?? "Chief Compliance Officer"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Acceptance criteria</dt>
            <dd className="font-medium">{impact.evidenceRequired.join(" · ")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Marketing-only: CCO escalation card (MKT-EMAIL-01 + any other escalations)
// -----------------------------------------------------------------------------
function CcoEscalationSection({
  practices,
  items,
  decisions,
  onDecide,
}: {
  practices: PracticeRecord[];
  items: ComplianceItem[];
  decisions: Record<string, PracticeDecisionRecord>;
  onDecide: () => void;
}) {
  // Build one escalation per (item, impact) whose escalation is present OR
  // whose assessment is unknown due to missing/stale evidence.
  const escalations = items.flatMap((i) =>
    i.impacts
      .filter(
        (im) =>
          im.department === "marketing" &&
          (im.escalation || im.assessmentStatus === "unknown"),
      )
      .map((im) => ({ item: i, impact: im })),
  );
  if (escalations.length === 0) return null;

  return (
    <div className="space-y-3">
      <SectionTitle
        title="CCO decision queue"
        sub="Marketing Agent refused to guess. Each card is presented to the CCO exactly as the agent produced it — known, uncertain, business impact, recommended default, and the exact decision required."
      />
      <div className="space-y-4">
        {escalations.map(({ item, impact }) => {
          const pids = impact.citedPracticeIds;
          const relatedPractices = practices.filter((p) => pids.includes(p.practice_id));
          const decision = pids
            .map((pid) => decisions[pid])
            .find(Boolean) as PracticeDecisionRecord | undefined;
          return (
            <CcoEscalationCard
              key={item.id + impact.department}
              item={item}
              impact={impact}
              practices={relatedPractices}
              decision={decision}
              onDecide={onDecide}
            />
          );
        })}
      </div>
    </div>
  );
}

const decisionLabel: Record<PracticeDecision, string> = {
  approved_recommendation: "Approved agent recommendation",
  overridden_allow: "Overridden — allow with acknowledged risk",
  more_evidence_requested: "Requested more evidence",
};

function CcoEscalationCard({
  item,
  impact,
  practices,
  decision,
  onDecide,
}: {
  item: ComplianceItem;
  impact: DepartmentImpact;
  practices: PracticeRecord[];
  decision?: PracticeDecisionRecord;
  onDecide: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<PracticeDecision | null>(null);
  const primaryPracticeId = impact.citedPracticeIds[0];

  const decide = async (kind: PracticeDecision) => {
    if (!primaryPracticeId) return;
    setBusy(kind);
    await setPracticeDecision({
      practiceId: primaryPracticeId,
      decision: kind,
      actor: "Meera Iyer (CCO)",
      note: note || undefined,
    });
    await appendHumanAction({
      itemId: item.id,
      actor: "Meera Iyer (CCO)",
      action: decisionLabel[kind],
      summary: note || `Decision recorded on ${primaryPracticeId}.`,
    });
    setBusy(null);
    setNote("");
    onDecide();
    toast.success(decisionLabel[kind]);
  };

  const undo = async () => {
    if (!primaryPracticeId) return;
    await clearPracticeDecision(primaryPracticeId);
    onDecide();
    toast.info("Decision cleared");
  };

  return (
    <Card className="border-status-critical/40 shadow-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-status-critical">
            <ShieldQuestion className="h-3.5 w-3.5" /> Escalation to CCO
          </div>
          <CardTitle className="mt-1 text-base">{item.title}</CardTitle>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Link
              to="/compliance/$itemId"
              params={{ itemId: item.id }}
              className="font-mono tabular-nums hover:underline"
            >
              {item.id}
            </Link>
            {item.source && <span>· {item.source.section}</span>}
            <RiskBadge value={item.risk} />
            <AssessmentBadge value={impact.assessmentStatus} />
            <ConfidenceChip value={impact.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <EscalationField label="What is known" tone="ok">
            {impact.currentState}
          </EscalationField>
          <EscalationField label="What is uncertain or conflicting" tone="unknown">
            {impact.escalation?.reason ??
              "The Marketing Agent could not verify consent evidence on the cited practice record and refuses to default to compliant."}
          </EscalationField>
          <EscalationField label="Business impact of waiting" tone="warn">
            Marketing operations pause on the affected workflow until this is resolved — audience
            activations and dispatches remain blocked.
          </EscalationField>
          <EscalationField label="Business impact of acting anyway" tone="critical">
            Proceeding without evidence risks a DPDP breach on Section 6(1) — penalties apply per
            affected principal.
          </EscalationField>
        </div>

        <EscalationField label="Agent's recommended default action" tint="agent">
          {impact.requiredActions[0] ?? "Block the workflow until evidence is on file."}
        </EscalationField>

        <div className="rounded-md border-2 border-status-critical/60 bg-status-critical/5 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-status-critical">
            Decision required from the CCO
          </div>
          <div className="mt-1 text-sm font-semibold">
            {impact.escalation?.decisionRequired ??
              "Approve the agent recommendation, override with acknowledged risk, or send back for more evidence."}
          </div>
        </div>

        {practices.length > 0 && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-[11px]">
            <div className="mb-1 font-medium text-muted-foreground">Cited practice records</div>
            <ul className="space-y-1">
              {practices.map((p) => (
                <li key={p.practice_id} className="flex items-center gap-2">
                  <a href={`#${p.practice_id}`} className="font-mono hover:underline">
                    {p.practice_id}
                  </a>
                  <span>· {p.channel}</span>
                  {p.consent_evidence === null && (
                    <span className="inline-flex items-center gap-1 rounded border border-dashed border-status-unknown px-1 py-0.5 font-semibold text-status-unknown">
                      <HelpCircle className="h-3 w-3" /> No consent evidence
                    </span>
                  )}
                  {p.last_verified_at === null && (
                    <span className="inline-flex items-center gap-1 rounded border border-status-high/40 bg-status-high/10 px-1 py-0.5 text-status-high">
                      <AlertTriangle className="h-3 w-3" /> Never verified
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decision ? (
          <div className="flex items-center justify-between rounded-md border border-status-ok/40 bg-status-ok/5 p-3 text-xs">
            <div>
              <div className="font-semibold text-status-ok">
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                {decisionLabel[decision.decision]}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {decision.actor} · {formatDateTime(decision.at)}
                {decision.note && <> · "{decision.note}"</>}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8" onClick={undo}>
              Undo
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Add a note explaining the decision (optional)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[64px] text-xs"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => decide("more_evidence_requested")}
                disabled={busy !== null}
              >
                <MessageSquareWarning className="h-3.5 w-3.5" /> Request more evidence
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-status-critical/40 text-status-critical hover:bg-status-critical/10"
                onClick={() => decide("overridden_allow")}
                disabled={busy !== null}
              >
                <AlertOctagon className="h-3.5 w-3.5" /> Override — accept risk
              </Button>
              <Button
                size="sm"
                onClick={() => decide("approved_recommendation")}
                disabled={busy !== null}
              >
                <Check className="h-3.5 w-3.5" /> Approve agent recommendation
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EscalationField({
  label,
  children,
  tone,
  tint,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "ok" | "warn" | "unknown" | "critical";
  tint?: "agent";
}) {
  const cls =
    tint === "agent"
      ? "border-primary/25 bg-primary/[0.04]"
      : tone === "ok"
        ? "border-status-ok/30 bg-status-ok/5"
        : tone === "warn"
          ? "border-status-high/30 bg-status-high/5"
          : tone === "unknown"
            ? "border-dashed border-status-unknown/60 bg-status-unknown/5"
            : tone === "critical"
              ? "border-status-critical/40 bg-status-critical/5"
              : "border-border bg-background";
  return (
    <div className={cn("rounded-md border p-2 text-xs leading-relaxed", cls)}>
      <div
        className={cn(
          "mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide",
          tint === "agent" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {tint === "agent" && <Bot className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Marketing-only: practice knowledge base
// -----------------------------------------------------------------------------
function PracticeTable({
  practices,
  items,
}: {
  practices: PracticeRecord[];
  items: ComplianceItem[];
}) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Deep-link support: /departments/marketing#MKT-EMAIL-01 scrolls to and
  // opens the row. Re-runs on hashchange too.
  useEffect(() => {
    const apply = () => {
      const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      if (!h) return;
      if (practices.some((p) => p.practice_id === h)) {
        setOpenRow(h);
        setHighlight(h);
        // scroll after paint
        requestAnimationFrame(() => {
          const el = document.getElementById(h);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        // clear highlight after a moment
        window.setTimeout(() => setHighlight(null), 2500);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [practices]);

  // Which items cite each practice
  const citations = useMemo(() => {
    const map: Record<string, ComplianceItem[]> = {};
    for (const i of items) {
      for (const im of i.impacts) {
        for (const pid of im.citedPracticeIds) {
          (map[pid] ||= []).push(i);
        }
      }
    }
    // dedupe
    for (const k of Object.keys(map)) {
      map[k] = Array.from(new Map(map[k].map((i) => [i.id, i])).values());
    }
    return map;
  }, [items]);

  const isStale = (iso: string | null): boolean => {
    if (iso === null) return true;
    const ms = Date.now() - new Date(iso).getTime();
    return ms > 1000 * 60 * 60 * 24 * 180; // >180 days
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Practice</th>
                <th className="px-3 py-2 text-left font-medium">Channel</th>
                <th className="px-3 py-2 text-left font-medium">Purpose</th>
                <th className="px-3 py-2 text-left font-medium">Consent evidence</th>
                <th className="px-3 py-2 text-left font-medium">Last verified</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2" aria-label="expand" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {practices.map((p) => {
                const missingConsent = p.consent_evidence === null;
                const stale = isStale(p.last_verified_at);
                const open = openRow === p.practice_id;
                const highlighted = highlight === p.practice_id;
                const cited = citations[p.practice_id] ?? [];
                return (
                  <Fragment key={p.practice_id}>
                    <tr
                      id={p.practice_id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/40",
                        missingConsent && "bg-status-critical/5",
                        highlighted && "ring-2 ring-primary ring-offset-1",
                      )}
                      onClick={() => setOpenRow(open ? null : p.practice_id)}
                    >
                      <td className="px-3 py-2 font-mono tabular-nums font-medium">
                        {p.practice_id}
                      </td>
                      <td className="px-3 py-2">{p.channel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.purpose}</td>
                      <td className="px-3 py-2">
                        {missingConsent ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-status-critical/60 bg-status-critical/10 px-2 py-0.5 font-semibold text-status-critical">
                            <AlertOctagon className="h-3 w-3" /> No consent evidence on record
                          </span>
                        ) : (
                          <span className="text-foreground/90">{p.consent_evidence}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {p.last_verified_at === null ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-status-unknown bg-status-unknown/10 px-2 py-0.5 font-semibold text-status-unknown">
                            <HelpCircle className="h-3 w-3" /> Never verified
                          </span>
                        ) : stale ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-status-high/40 bg-status-high/10 px-2 py-0.5 font-medium text-status-high">
                            <AlertTriangle className="h-3 w-3" />
                            Stale — needs re-verification
                            <span className="ml-1 text-[10px] text-status-high/80 tabular-nums">
                              ({p.last_verified_at.slice(0, 10)})
                            </span>
                          </span>
                        ) : (
                          <span className="tabular-nums text-foreground/90">
                            {p.last_verified_at.slice(0, 10)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{p.owner}</td>
                      <td className="px-3 py-2 text-right">
                        <ChevronDown
                          className={cn(
                            "inline h-4 w-4 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </td>
                    </tr>
                    {open && (
                      <tr key={p.practice_id + "-detail"} className="bg-muted/20">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <PracticeDetail label="Data collected">
                              {p.data_collected.join(", ")}
                            </PracticeDetail>
                            <PracticeDetail label="Collection source">
                              {p.collection_source}
                            </PracticeDetail>
                            <PracticeDetail label="Consent method">{p.consent_method}</PracticeDetail>
                            <PracticeDetail label="Processors">
                              {p.processors.join(", ")}
                            </PracticeDetail>
                            <PracticeDetail label="Retention">{p.retention}</PracticeDetail>
                            <PracticeDetail label="Opt-out process">
                              {p.opt_out_process}
                            </PracticeDetail>
                          </div>
                          <div className="mt-3 rounded-md border border-border bg-background p-2 text-[11px]">
                            <div className="mb-1 font-medium text-muted-foreground">
                              Cited by compliance items
                            </div>
                            {cited.length === 0 ? (
                              <div className="text-muted-foreground">
                                No compliance items cite this practice yet.
                              </div>
                            ) : (
                              <ul className="flex flex-wrap gap-2">
                                {cited.map((i) => (
                                  <li key={i.id}>
                                    <Link
                                      to="/compliance/$itemId"
                                      params={{ itemId: i.id }}
                                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 hover:border-primary/50 hover:text-primary"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span className="font-mono tabular-nums">{i.id}</span>
                                      <span className="truncate">— {i.title}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border p-2 text-[11px] text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" /> Rows with missing consent evidence or
          never/stale verification are why the Marketing Agent returned{" "}
          <span className="font-semibold text-status-unknown">unknown</span> and escalated —
          not a styling flourish.
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-2 text-xs">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-foreground/90">{children}</div>
    </div>
  );
}
