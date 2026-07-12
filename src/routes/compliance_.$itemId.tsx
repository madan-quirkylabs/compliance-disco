import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertOctagon,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Landmark,
  MessageSquareWarning,
  Quote,
  User,
} from "lucide-react";

import {
  appendHumanAction,
  getComplianceItem,
  setDepartmentSignoff,
  setItemStatus,
} from "@/data/adapter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
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
import { PipelineStepper } from "@/components/PipelineStepper";
import {
  agentLabel,
  departmentLabel,
  formatDateTime,
  formatRelative,
} from "@/lib/format";
import { useViewMode, viewModeLabel } from "@/lib/view-mode";
import { cn } from "@/lib/utils";
import type {
  ActivityEvent,
  ComplianceItem,
  Department,
  DepartmentImpact,
  ItemStatus,
  Signoff,
} from "@/data/types";

export const Route = createFileRoute("/compliance_/$itemId")({
  loader: async ({ params }) => {
    const item = await getComplianceItem(params.itemId);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ params, loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${params.itemId} · ${loaderData.item.title} — Compliance Disco`
          : `${params.itemId} — Compliance Disco`,
      },
      {
        name: "description",
        content:
          "The full trace of a DPDP requirement — source citation, department impact, agent handoff chain, and sign-off state.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: ItemNotFound,
  component: ItemDetailPage,
});

function ItemNotFound() {
  const { itemId } = Route.useParams();
  return (
    <div className="mx-auto max-w-[900px] p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Item not found</div>
          <p className="mt-1 text-sm text-muted-foreground">
            No compliance item matches <code className="font-mono">{itemId}</code>.
          </p>
          <div className="mt-4">
            <Link to="/compliance" className="text-sm font-medium text-primary hover:underline">
              ← Back to compliance items
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Which lifecycle steps are complete when the item is at a given status.
const lifecycleStages: ItemStatus[] = [
  "extracted",
  "routed",
  "analysing",
  "review",
  "signed_off",
  "implemented",
];
const lifecycleLabel: Record<ItemStatus, string> = {
  extracted: "Extracted",
  routed: "Routed",
  analysing: "Analysed",
  review: "Reviewed",
  signed_off: "Signed off",
  implemented: "Implemented",
  in_fdo: "In FDO",
};

function actorName(mode: string): string {
  switch (mode) {
    case "engineering":
      return "Arjun Rao (Engineering Lead)";
    case "marketing":
      return "Priya Nair (Marketing Lead)";
    case "auditor":
      return "External Auditor";
    default:
      return "Meera Iyer (CCO)";
  }
}

function ItemDetailPage() {
  const loaderData = Route.useLoaderData() as { item: ComplianceItem };
  const initialItem: ComplianceItem = loaderData.item;
  const params = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { mode } = useViewMode();

  const { data: item = initialItem } = useQuery<ComplianceItem>({
    queryKey: ["item", params.itemId],
    queryFn: () => getComplianceItem(params.itemId).then((x) => x ?? initialItem),
    initialData: initialItem,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["item", params.itemId] });
    qc.invalidateQueries({ queryKey: ["items"] });
  };

  const [activeDept, setActiveDept] = useState<Department>(item.departments[0] ?? "engineering");

  // ---- Actions --------------------------------------------------------------
  const approve = async () => {
    const who = actorName(mode);
    await Promise.all(
      item.impacts.map((im) =>
        setDepartmentSignoff({ itemId: item.id, department: im.department, signoff: "approved" }),
      ),
    );
    await setItemStatus({ itemId: item.id, status: "signed_off" });
    await appendHumanAction({
      itemId: item.id,
      actor: who,
      action: "Approved",
      summary: `Signed off ${item.id} — ${item.impacts
        .map((im) => departmentLabel[im.department])
        .join(" and ")} assessment${item.impacts.length > 1 ? "s" : ""}.`,
    });
    invalidate();
    toast.success(`Approved and signed off ${item.id}`);
  };
  const requestChanges = async () => {
    const who = actorName(mode);
    await Promise.all(
      item.impacts.map((im) =>
        setDepartmentSignoff({
          itemId: item.id,
          department: im.department,
          signoff: "changes_requested",
        }),
      ),
    );
    await appendHumanAction({
      itemId: item.id,
      actor: who,
      action: "Requested changes",
      summary: "Sent back to the department agents for a revised assessment.",
    });
    invalidate();
    toast.warning("Changes requested");
  };
  const markImplemented = async () => {
    const who = actorName(mode);
    await setItemStatus({ itemId: item.id, status: "implemented" });
    await appendHumanAction({
      itemId: item.id,
      actor: who,
      action: "Marked implemented",
      summary: "Confirmed the required actions are in production.",
    });
    invalidate();
    toast.success("Marked as implemented");
  };

  const humanApproved = item.impacts.every((im) => im.signoff === "approved");

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/compliance" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Compliance items
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono tabular-nums">{item.id}</span>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono tabular-nums text-muted-foreground">{item.id}</span>
                <span className="text-muted-foreground">·</span>
                <RiskBadge value={item.risk} />
                <StatusBadge value={item.status} />
                {item.departments.map((d) => (
                  <DepartmentBadge key={d} value={d} />
                ))}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{item.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              {item.owner && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-foreground/80">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{item.owner}</span>
                  {item.dueDate && (
                    <span className="text-muted-foreground">· due {formatDateTime(item.dueDate).split(",")[0]}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Acting as {viewModeLabel[mode]}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" onClick={approve} className="h-8 gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestChanges}
                  className="h-8 gap-1"
                >
                  <MessageSquareWarning className="h-4 w-4" /> Request changes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={markImplemented}
                  disabled={!humanApproved}
                  className="h-8 gap-1"
                  title={humanApproved ? "" : "All departments must be approved first"}
                >
                  <Check className="h-4 w-4" /> Mark implemented
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Source requirement */}
      <SectionHeader
        step={1}
        icon={<Landmark className="h-4 w-4" />}
        title="Source requirement"
        subtitle="Plain-language summary, verbatim excerpt, and the exact citation."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Plain-language summary
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{item.summary}</p>
            <div className="mt-4 flex items-center gap-2">
              <ConfidenceChip value={item.confidence} />
              <span className="text-[11px] text-muted-foreground">Extractor confidence</span>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Verbatim excerpt · DPDP Act 2023
              </div>
              {item.source ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-mono tabular-nums text-primary">
                  <FileText className="h-3 w-3" />
                  {item.source.section}
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-dashed border-status-unknown bg-status-unknown/10 px-2 py-0.5 text-xs font-semibold text-status-unknown">
                  <HelpCircle className="h-3 w-3" />
                  No verbatim citation on file
                </span>
              )}
            </div>
            {item.source ? (
              <blockquote className="mt-3 border-l-4 border-primary/40 bg-muted/40 py-3 pl-4 pr-3 font-mono text-[13px] leading-relaxed text-foreground/90">
                <Quote className="mb-1 inline h-3 w-3 text-muted-foreground" aria-hidden />{" "}
                {item.source.excerpt}
                <div className="mt-2 font-sans text-[11px] not-italic text-muted-foreground">
                  — DPDP Act 2023, {item.source.section}
                </div>
              </blockquote>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                The Extractor did not find a verbatim clause covering this requirement. This is
                surfaced honestly rather than paraphrasing the Act.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Why it matters */}
      <SectionHeader
        step={2}
        icon={<AlertOctagon className="h-4 w-4" />}
        title="Why it matters"
        subtitle="Risk if ignored and why this requirement applies to us."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Risk if ignored
            </div>
            <p className="mt-2 text-sm leading-relaxed">{item.riskIfIgnored}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Applicability rationale
            </div>
            <p className="mt-2 text-sm leading-relaxed">{item.applicabilityRationale}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Department impact tabs */}
      <SectionHeader
        step={3}
        icon={<Bot className="h-4 w-4" />}
        title="Department impact"
        subtitle="Legal requirement, current practice, and the agent's required actions — kept as separate labelled fields, never blended."
      />
      <Tabs
        value={activeDept}
        onValueChange={(v) => setActiveDept(v as Department)}
      >
        <TabsList>
          {item.departments.map((d) => (
            <TabsTrigger key={d} value={d}>
              <DepartmentBadge value={d} />
            </TabsTrigger>
          ))}
        </TabsList>
        {item.departments.map((d) => {
          const impact = item.impacts.find((im) => im.department === d);
          return (
            <TabsContent key={d} value={d}>
              {impact ? (
                <ImpactPanel item={item} impact={impact} />
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No {departmentLabel[d]} impact assessment has been produced yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 4. Activity & handoff chain */}
      <SectionHeader
        step={4}
        icon={<Clock className="h-4 w-4" />}
        title="Activity & agent handoff chain"
        subtitle="Extractor → Coordinator → Department agents → Composer, interleaved with human actions. Each agent step reveals its input, reasoning, output, and handoff."
      />
      <ActivityChain events={item.activity} />

      {/* 5. Lifecycle stepper */}
      <SectionHeader
        step={5}
        icon={<ChevronRight className="h-4 w-4" />}
        title="Lifecycle"
      />
      <Card>
        <CardContent className="p-4">
          <LifecycleStepper status={item.status} />
        </CardContent>
      </Card>

      {/* 6. FDO inclusion preview */}
      <SectionHeader
        step={6}
        icon={<FileText className="h-4 w-4" />}
        title="FDO inclusion preview"
        subtitle="The exact prose this item will contribute to the Formal Compliance Document."
      />
      <Card>
        <CardContent className="p-5">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              §{lifecycleStages.indexOf("signed_off") + 1} · {item.source?.section ?? "General"}
            </div>
            <p className="font-serif text-[15px] leading-relaxed text-foreground/90">
              {item.fdoSection}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              Composer · this paragraph is auto-included when all departments are signed off.
            </div>
            <Link to="/fdo" className="text-xs font-medium text-primary hover:underline">
              Open full FDO preview →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Nav footer */}
      <div className="flex justify-between pt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate({ to: "/compliance" })}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to compliance items
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
function ImpactPanel({ item, impact }: { item: ComplianceItem; impact: DepartmentImpact }) {
  const isUnknown = impact.assessmentStatus === "unknown";
  return (
    <div className="space-y-4">
      {/* Meta strip */}
      <Card
        className={cn(
          isUnknown &&
            "border-dashed border-status-unknown/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,color-mix(in_oklab,var(--color-status-unknown)_12%,transparent)_6px,color-mix(in_oklab,var(--color-status-unknown)_12%,transparent)_12px)]",
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <AssessmentBadge value={impact.assessmentStatus} />
          <ConfidenceChip value={impact.confidence} />
          <div className="flex items-center gap-1 text-xs text-foreground/80">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {impact.owner}
          </div>
          <div className="text-xs text-muted-foreground">
            due {formatDateTime(impact.dueDate).split(",")[0]}
          </div>
          <div className="ml-auto">
            <SignoffBadge value={impact.signoff} />
          </div>
        </CardContent>
      </Card>

      {isUnknown && (
        <Card className="border-dashed border-status-unknown/60 bg-status-unknown/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-unknown" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-status-unknown">
                  Unknown — evidence missing
                </div>
                <p className="mt-1 text-sm text-foreground/90">
                  The Marketing Agent refused to guess. This is neither a pass nor a fail — a
                  human decision is required before it can advance.
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  <FieldRow label="Missing evidence">
                    <ul className="list-disc pl-5">
                      {impact.evidenceRequired.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </FieldRow>
                  {impact.escalation && (
                    <>
                      <FieldRow label="Escalation reason">
                        <span>{impact.escalation.reason}</span>
                      </FieldRow>
                      <FieldRow label="Decision required">
                        <span className="font-medium text-foreground">
                          {impact.escalation.decisionRequired}
                        </span>
                      </FieldRow>
                      {impact.escalation.escalatedTo && (
                        <FieldRow label="Escalated to">
                          <span>{impact.escalation.escalatedTo}</span>
                        </FieldRow>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {impact.escalation && !isUnknown && (
        <Card className="border-status-critical/40 bg-status-critical/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-status-critical" />
            <div>
              <div className="text-sm font-semibold text-status-critical">Escalation</div>
              <p className="mt-1 text-sm">{impact.escalation.reason}</p>
              <p className="mt-1 text-sm font-medium">
                Decision required: {impact.escalation.decisionRequired}
              </p>
              {impact.escalation.escalatedTo && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Escalated to {impact.escalation.escalatedTo}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent-tinted content — separate labelled fields, never a blob */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {agentLabel[impact.department === "engineering" ? "engineering" : "marketing"]} output
            </span>
            <span className="ml-auto">
              <ConfidenceChip value={impact.confidence} />
            </span>
          </div>
          <FieldRow label="Legal requirement" strong>
            <p>{impact.interpretation}</p>
          </FieldRow>
          <FieldRow label="Observed current practice">
            <p>{impact.currentState}</p>
            {impact.citedPracticeIds.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted-foreground">Cited practices:</span>
                {impact.citedPracticeIds.map((pid) => (
                  <Link
                    key={pid}
                    to="/departments/$dept"
                    params={{ dept: "marketing" }}
                    className="rounded-md border border-agent-marketing/40 bg-agent-marketing/10 px-1.5 py-0.5 font-mono text-[11px] text-agent-marketing hover:underline"
                  >
                    {pid}
                  </Link>
                ))}
              </div>
            )}
          </FieldRow>
          <FieldRow label="Agent recommendation" strong>
            <ul className="space-y-1">
              {impact.requiredActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border" aria-hidden />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </FieldRow>
          <FieldRow label="Evidence required">
            <ul className="list-disc pl-5">
              {impact.evidenceRequired.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </FieldRow>
        </CardContent>
      </Card>
      <div className="text-[11px] text-muted-foreground">
        This entire panel was generated by the {departmentLabel[impact.department]} Agent for{" "}
        <span className="font-mono">{item.id}</span> — human approvals appear separately on the
        activity chain below.
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          strong ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      <div className="mt-1 text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
function ActivityChain({ events }: { events: ActivityEvent[] }) {
  const sorted = [...events].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  return (
    <Card>
      <CardContent className="p-0">
        <ol className="divide-y divide-border">
          {sorted.map((evt) => (
            <li key={evt.id}>
              <ActivityRow event={evt} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const [open, setOpen] = useState(false);
  const isAgent = event.actorType === "agent";
  const hasDetail = Boolean(
    event.input !== undefined ||
      event.output !== undefined ||
      event.reasoning ||
      event.handoffTo,
  );
  return (
    <div
      className={cn(
        "px-4 py-3",
        isAgent
          ? "bg-primary/[0.025]"
          : "bg-background",
      )}
    >
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-start gap-3 text-left",
          hasDetail && "cursor-pointer",
        )}
        aria-expanded={hasDetail ? open : undefined}
      >
        <div className="shrink-0">
          {isAgent && event.agentKind ? (
            <AgentPill kind={event.agentKind} />
          ) : (
            <HumanChip name={event.actor.split(" (")[0]} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{event.action}</span>
            <span className="text-xs text-muted-foreground">
              by {event.actor}
            </span>
            {event.confidence !== undefined && <ConfidenceChip value={event.confidence} />}
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {formatDateTime(event.timestamp)} · {formatRelative(event.timestamp)}
            </span>
          </div>
          {event.summary && (
            <p className="mt-1 text-sm text-foreground/80">{event.summary}</p>
          )}
          {event.handoffTo && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Handed off to <span className="font-medium text-foreground">{event.handoffTo}</span>
            </div>
          )}
        </div>
        {hasDetail && (
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && hasDetail && isAgent && (
        <div className="ml-1 mt-3 grid gap-3 rounded-md border border-primary/20 bg-background/60 p-3 md:grid-cols-2">
          <DetailBlock label="Received (input)">
            <JsonPretty value={event.input} />
          </DetailBlock>
          <DetailBlock label="Decided (reasoning)">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {event.reasoning ?? event.summary}
            </p>
          </DetailBlock>
          <DetailBlock label="Produced (output)">
            <JsonPretty value={event.output} />
          </DetailBlock>
          <DetailBlock label="Handed off to">
            <p className="text-sm">
              {event.handoffTo ?? <span className="text-muted-foreground">— end of chain —</span>}
            </p>
          </DetailBlock>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function JsonPretty({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return <p className="text-xs text-muted-foreground">—</p>;
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed text-foreground/90">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// -----------------------------------------------------------------------------
function LifecycleStepper({ status }: { status: ItemStatus }) {
  const idx =
    status === "in_fdo"
      ? lifecycleStages.length - 1
      : lifecycleStages.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Item lifecycle">
      {lifecycleStages.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                done && "border-status-ok/40 bg-status-ok/10 text-status-ok",
                current && "border-primary/40 bg-primary/10 text-primary",
                !done && !current && "border-border bg-background text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px] tabular-nums">
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {lifecycleLabel[s]}
            </div>
            {i < lifecycleStages.length - 1 && (
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

// -----------------------------------------------------------------------------
function SectionHeader({
  step,
  icon,
  title,
  subtitle,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pt-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Step {step}
          </span>
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// Ensure the PipelineStepper import isn't tree-shaken (used indirectly for demo alignment)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keep = PipelineStepper;
