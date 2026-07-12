import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  Braces,
  Check,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Landmark,
  Quote,
  ScrollText,
} from "lucide-react";

import {
  clearFdoSignoffs,
  getComposedFdo,
  setFdoSignoff,
  type ComposedFdo,
} from "@/data/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepartmentBadge, SignoffBadge } from "@/components/badges";
import { departmentLabel, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fdo")({
  head: () => ({
    meta: [
      { title: "FDO Preview — Compliance Disco" },
      {
        name: "description",
        content:
          "The Formal Compliance Document assembled by the Composer agent from every extracted DPDP requirement.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FdoPage,
});

function FdoPage() {
  const qc = useQueryClient();
  const { data: doc, isLoading } = useQuery({
    queryKey: ["fdo"],
    queryFn: getComposedFdo,
  });
  const [view, setView] = useState<"document" | "structured">("document");

  if (isLoading || !doc) {
    return (
      <div className="mx-auto max-w-[1000px] p-6" aria-busy>
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-96 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const escalations = doc.openRisks.filter((r) => r.kind === "escalation");
  const unknowns = doc.openRisks.filter((r) => r.kind === "unknown");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fdo"] });

  const approveDept = async (dept: "engineering" | "marketing") => {
    await setFdoSignoff({ department: dept, state: "approved", actor: "Meera Iyer (CCO)" });
    invalidate();
    toast.success(`${departmentLabel[dept]} sign-off recorded`);
  };
  const revokeAll = async () => {
    await clearFdoSignoffs();
    invalidate();
    toast.info("FDO sign-offs reset");
  };
  const approveForSignoff = async () => {
    await Promise.all([
      setFdoSignoff({ department: "engineering", state: "approved", actor: "Meera Iyer (CCO)" }),
      setFdoSignoff({ department: "marketing", state: "approved", actor: "Meera Iyer (CCO)" }),
    ]);
    invalidate();
    toast.success("FDO approved for sign-off");
  };
  const exportPdf = () => {
    toast.info("PDF export is not wired up in the MVP", {
      description:
        "The composed document is available in Structured view as JSON. Wire up a PDF renderer post-MVP.",
    });
  };

  const fullyApproved = doc.signoffByDepartment.every((s) => s.state === "approved");

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary">
                <ScrollText className="h-3 w-3" /> Formal Compliance Document
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                FDO-DPDP-{doc.updatedAt.slice(0, 10)}
              </span>
              <span className="text-muted-foreground">· composed from {doc.itemCount} items</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              DPDP Act, 2023 — Compliance Position
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.scope}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last composed {formatDateTime(doc.updatedAt)} — this preview re-derives from the
              compliance items every time you open it.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* View toggle */}
            <div className="inline-flex rounded-md border border-border p-0.5" role="tablist">
              <ViewTab active={view === "document"} onClick={() => setView("document")}>
                <FileText className="h-3.5 w-3.5" /> Document
              </ViewTab>
              <ViewTab active={view === "structured"} onClick={() => setView("structured")}>
                <Braces className="h-3.5 w-3.5" /> Structured
              </ViewTab>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={exportPdf}>
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Button>
              <Button
                size="sm"
                className="h-8"
                onClick={approveForSignoff}
                disabled={fullyApproved}
                title={fullyApproved ? "Already approved for sign-off" : ""}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                {fullyApproved ? "Approved for sign-off" : "Approve for sign-off"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {view === "structured" ? (
        <StructuredView doc={doc} />
      ) : (
        <DocumentView
          doc={doc}
          escalations={escalations}
          unknowns={unknowns}
          onApproveDept={approveDept}
          onRevokeAll={revokeAll}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Document view
// -----------------------------------------------------------------------------
function DocumentView({
  doc,
  escalations,
  unknowns,
  onApproveDept,
  onRevokeAll,
}: {
  doc: ComposedFdo;
  escalations: ComposedFdo["openRisks"];
  unknowns: ComposedFdo["openRisks"];
  onApproveDept: (d: "engineering" | "marketing") => void;
  onRevokeAll: () => void;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-8 print:border-0 print:p-0">
      <div className="mx-auto max-w-[68ch] space-y-8 font-serif text-[15px] leading-[1.75] text-foreground/90">
        {/* Executive summary */}
        <DocSection number="1" title="Executive summary">
          <p>{doc.executive}</p>
        </DocSection>

        {/* Regulation and scope */}
        <DocSection number="2" title="Regulation and scope">
          <p>
            <strong className="font-semibold">Regulation.</strong> {doc.regulation}.
          </p>
          <p>
            <strong className="font-semibold">Scope.</strong> {doc.scope}
          </p>
        </DocSection>

        {/* Organisation-wide obligations */}
        {doc.orgObligations.length > 0 && (
          <DocSection number="3" title="Organisation-wide obligations">
            <p className="text-sm text-muted-foreground">
              Requirements that cut across more than one department.
            </p>
            <div className="space-y-4">
              {doc.orgObligations.map((s) => (
                <DocClause key={s.id} itemId={s.id} title={s.title} body={s.body} />
              ))}
            </div>
          </DocSection>
        )}

        {/* Engineering actions */}
        <DocSection number="4" title="Engineering actions">
          <p className="text-sm text-muted-foreground">
            Controls, jobs and logs Engineering will ship, with per-item evidence expected.
          </p>
          <div className="space-y-4">
            {doc.engineeringActions.map((s) => (
              <DocClause key={s.id} itemId={s.id} title={s.title} body={s.body} />
            ))}
          </div>
          {doc.engineeringActions.length === 0 && (
            <p className="text-sm text-muted-foreground">No engineering-only actions this cycle.</p>
          )}
        </DocSection>

        {/* Marketing actions */}
        <DocSection number="5" title="Marketing actions">
          <p className="text-sm text-muted-foreground">
            Consent, audience and workflow changes Marketing will make, with completion evidence
            expected.
          </p>
          <div className="space-y-4">
            {doc.marketingActions.map((s) => (
              <DocClause key={s.id} itemId={s.id} title={s.title} body={s.body} />
            ))}
          </div>
          {doc.marketingActions.length === 0 && (
            <p className="text-sm text-muted-foreground">No marketing-only actions this cycle.</p>
          )}
        </DocSection>

        {/* Responsibility matrix */}
        <DocSection number="6" title="Responsibility matrix">
          <div className="not-prose overflow-x-auto rounded-md border border-border font-sans">
            <table className="min-w-full text-xs">
              <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Section</th>
                  <th className="px-3 py-2 text-left font-medium">Owner</th>
                  <th className="px-3 py-2 text-left font-medium">Department</th>
                  <th className="px-3 py-2 text-left font-medium">Due</th>
                  <th className="px-3 py-2 text-left font-medium">Sign-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doc.responsibilityMatrix.map((r, i) => (
                  <tr key={r.itemId + r.department + i} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono tabular-nums">
                      <Link
                        to="/compliance/$itemId"
                        params={{ itemId: r.itemId }}
                        className="hover:underline"
                      >
                        {r.itemId}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.section}</td>
                    <td className="px-3 py-2">{r.owner}</td>
                    <td className="px-3 py-2">
                      <DepartmentBadge value={r.department} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.dueDate}</td>
                    <td className="px-3 py-2">
                      <SignoffBadge value={r.signoff} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Open risks — the honest section */}
        <DocSection number="7" title="Open risks and unresolved items">
          {doc.openRisks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open risks or unresolved items — every finding is either compliant or has an
              approved remediation plan.
            </p>
          ) : (
            <div className="not-prose space-y-3 font-sans text-sm">
              {escalations.length > 0 && (
                <div className="rounded-md border-2 border-status-critical/60 bg-status-critical/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-status-critical">
                    <AlertOctagon className="mr-1 inline h-3.5 w-3.5" />
                    {escalations.length} escalation{escalations.length > 1 ? "s" : ""} awaiting
                    CCO decision
                  </div>
                  <ul className="mt-2 space-y-2">
                    {escalations.map((r) => (
                      <li key={r.itemId + r.department} className="text-sm">
                        <Link
                          to="/compliance/$itemId"
                          params={{ itemId: r.itemId }}
                          className="font-medium hover:underline"
                        >
                          {r.itemId} — {r.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">{r.department}</span> · {r.reason}
                        </div>
                        {r.decisionRequired && (
                          <div className="mt-1 text-xs">
                            <span className="text-muted-foreground">Decision required: </span>
                            <span className="text-foreground/90">{r.decisionRequired}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs italic text-muted-foreground">
                    This document is issued with these decisions still pending — the system does
                    not paper over an escalation to make the paperwork look neat.
                  </p>
                </div>
              )}
              {unknowns.length > 0 && (
                <div className="rounded-md border border-dashed border-status-unknown/60 bg-status-unknown/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-status-unknown">
                    <HelpCircle className="mr-1 inline h-3.5 w-3.5" />
                    {unknowns.length} assessment{unknowns.length > 1 ? "s" : ""} returned
                    unknown — evidence missing
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {unknowns.map((r) => (
                      <li key={r.itemId + r.department}>
                        <Link
                          to="/compliance/$itemId"
                          params={{ itemId: r.itemId }}
                          className="font-medium hover:underline"
                        >
                          {r.itemId} — {r.title}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {doc.openRisks.filter((r) => r.kind === "non_compliant").length > 0 && (
                <div className="rounded-md border border-status-high/40 bg-status-high/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-status-high">
                    Open non-compliance items pending remediation
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {doc.openRisks
                      .filter((r) => r.kind === "non_compliant")
                      .map((r) => (
                        <li key={r.itemId + r.department}>
                          <Link
                            to="/compliance/$itemId"
                            params={{ itemId: r.itemId }}
                            className="font-medium hover:underline"
                          >
                            {r.itemId} — {r.title}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">
                            <span className="font-mono">{r.department}</span> · {r.reason}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DocSection>

        {/* Sign-off status */}
        <DocSection number="8" title="Sign-off status by department">
          <div className="not-prose grid gap-3 font-sans sm:grid-cols-2">
            {doc.signoffByDepartment.map((s) => (
              <div
                key={s.department}
                className={cn(
                  "rounded-md border p-3",
                  s.state === "approved"
                    ? "border-status-ok/40 bg-status-ok/5"
                    : "border-border bg-background",
                )}
              >
                <div className="flex items-center gap-2">
                  <DepartmentBadge value={s.department} />
                  <SignoffBadge value={s.state} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Owner: <span className="font-medium text-foreground/90">{s.owner}</span>
                </div>
                {s.at && (
                  <div className="text-[11px] text-muted-foreground">
                    {s.actor} · {formatDateTime(s.at)}
                  </div>
                )}
                {s.state !== "approved" && (
                  <Button
                    size="sm"
                    className="mt-3 h-8"
                    onClick={() => onApproveDept(s.department)}
                  >
                    <Check className="h-3.5 w-3.5" /> Record {departmentLabel[s.department]}{" "}
                    sign-off
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRevokeAll}>
              Reset FDO sign-offs
            </Button>
          </div>
        </DocSection>

        {/* Citations appendix */}
        <DocSection number="A" title="Appendix — source citations">
          <p className="text-sm text-muted-foreground">
            Every DPDP section referenced by this document, linking back to the compliance item
            that cites it.
          </p>
          <div className="not-prose divide-y divide-border rounded-md border border-border font-sans">
            {doc.citations.map((c) => (
              <div key={c.itemId} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono tabular-nums text-primary">
                  <Landmark className="h-3 w-3" />
                  {c.section}
                </span>
                <Link
                  to="/compliance/$itemId"
                  params={{ itemId: c.itemId }}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  <span className="font-mono tabular-nums text-muted-foreground">{c.itemId}</span>{" "}
                  · <span className="text-foreground/90">{c.title}</span>
                </Link>
              </div>
            ))}
          </div>
        </DocSection>
      </div>
    </article>
  );
}

// -----------------------------------------------------------------------------
// Structured view
// -----------------------------------------------------------------------------
function StructuredView({ doc }: { doc: ComposedFdo }) {
  const json = useMemo(() => JSON.stringify(doc, null, 2), [doc]);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Composer output · structured</CardTitle>
        <span className="text-[11px] text-muted-foreground">
          The exact object the Composer emits, refreshed from the current compliance items.
        </span>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          <code>{json}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Small typography helpers
// -----------------------------------------------------------------------------
function DocSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-border pb-1 text-xl font-semibold tracking-tight">
        <span className="mr-3 font-mono tabular-nums text-muted-foreground">§{number}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DocClause({ itemId, title, body }: { itemId: string; title: string; body: string }) {
  return (
    <div className="border-l-2 border-primary/30 pl-4">
      <div className="mb-1 flex flex-wrap items-center gap-2 font-sans text-[11px]">
        <Link
          to="/compliance/$itemId"
          params={{ itemId }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono tabular-nums text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          <Quote className="h-3 w-3" />
          {itemId} — jump to source
        </Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{title}</span>
      </div>
      <p>{body}</p>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
