import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  ArrowDownAZ,
  ArrowUpAZ,
  HelpCircle,
  Search,
  X,
} from "lucide-react";

import { getComplianceItems } from "@/data/adapter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DepartmentBadge,
  RiskBadge,
  SignoffBadge,
  StatusBadge,
} from "@/components/badges";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type {
  ComplianceItem,
  Department,
  ItemStatus,
  Risk,
  Signoff,
} from "@/data/types";

const riskValues: Risk[] = ["critical", "high", "medium", "low"];
const deptValues: Department[] = ["engineering", "marketing"];
const stageValues: ItemStatus[] = [
  "extracted",
  "routed",
  "analysing",
  "review",
  "signed_off",
  "implemented",
  "in_fdo",
];
const signoffValues: Signoff[] = ["pending", "approved", "changes_requested"];

const presetValues = ["all", "high", "awaiting", "blocked", "ready"] as const;
type Preset = (typeof presetValues)[number];
const presetLabel: Record<Preset, string> = {
  all: "All",
  high: "High risk",
  awaiting: "Awaiting me",
  blocked: "Blocked",
  ready: "Ready for FDO",
};

const sortValues = ["priority", "activity"] as const;
type Sort = (typeof sortValues)[number];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  preset: fallback(z.string(), "all").default("all"),
  risk: fallback(z.array(z.string()), [] as string[]).default([] as string[]),
  dept: fallback(z.array(z.string()), [] as string[]).default([] as string[]),
  stage: fallback(z.array(z.string()), [] as string[]).default([] as string[]),
  signoff: fallback(z.array(z.string()), [] as string[]).default([] as string[]),
  sort: fallback(z.string(), "priority").default("priority"),
  dir: fallback(z.string(), "desc").default("desc"),
});

export type ComplianceSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/compliance")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Compliance Items — Compliance Disco" },
      {
        name: "description",
        content:
          "Searchable, filterable queue of every DPDP requirement — deep-linkable filters and keyboard-driven.",
      },
    ],
  }),
  component: ComplianceListPage,
});

const riskRank: Record<Risk, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function lastActivityTs(i: ComplianceItem): number {
  return i.activity.reduce((max, ev) => Math.max(max, new Date(ev.timestamp).getTime()), 0);
}

function isSignedOff(i: ComplianceItem): boolean {
  return i.status === "signed_off" || i.status === "implemented" || i.status === "in_fdo";
}
function isAwaiting(i: ComplianceItem): boolean {
  return !isSignedOff(i) && i.impacts.some((im) => im.signoff !== "approved");
}
function isBlocked(i: ComplianceItem): boolean {
  return i.impacts.some((im) => im.escalation) ||
    i.impacts.some((im) => im.assessmentStatus === "unknown");
}
function isReadyForFdo(i: ComplianceItem): boolean {
  return i.impacts.length > 0 &&
    i.impacts.every((im) => im.signoff === "approved") &&
    i.status !== "in_fdo";
}

function ComplianceListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/compliance" });
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["items"],
    queryFn: getComplianceItems,
  });

  const [qLocal, setQLocal] = useState(search.q);
  useEffect(() => setQLocal(search.q), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== search.q) {
        navigate({ to: ".", search: (prev: ComplianceSearch) => ({ ...prev, q: qLocal }) });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [qLocal, search.q, navigate]);

  const preset = (presetValues as readonly string[]).includes(search.preset)
    ? (search.preset as Preset)
    : "all";
  const sort: Sort = (sortValues as readonly string[]).includes(search.sort)
    ? (search.sort as Sort)
    : "priority";
  const dir = search.dir === "asc" ? "asc" : "desc";

  const riskFilter = new Set(search.risk.filter((r: string) => (riskValues as string[]).includes(r)));
  const deptFilter = new Set(search.dept.filter((d: string) => (deptValues as string[]).includes(d)));
  const stageFilter = new Set(search.stage.filter((s: string) => (stageValues as string[]).includes(s)));
  const signoffFilter = new Set(
    search.signoff.filter((s: string) => (signoffValues as string[]).includes(s)),
  );

  const filtered = useMemo(() => {
    let out = items.slice();
    const q = qLocal.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          (i.source?.section ?? "").toLowerCase().includes(q),
      );
    }
    if (riskFilter.size) out = out.filter((i) => riskFilter.has(i.risk));
    if (deptFilter.size)
      out = out.filter((i) => i.departments.some((d) => deptFilter.has(d)));
    if (stageFilter.size) out = out.filter((i) => stageFilter.has(i.status));
    if (signoffFilter.size)
      out = out.filter((i) =>
        i.impacts.some((im) => signoffFilter.has(im.signoff)),
      );
    if (preset === "high") out = out.filter((i) => i.risk === "high" || i.risk === "critical");
    else if (preset === "awaiting") out = out.filter(isAwaiting);
    else if (preset === "blocked") out = out.filter(isBlocked);
    else if (preset === "ready") out = out.filter(isReadyForFdo);

    out.sort((a, b) => {
      const cmp =
        sort === "priority"
          ? riskRank[a.risk] - riskRank[b.risk]
          : lastActivityTs(a) - lastActivityTs(b);
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, qLocal, search.risk.join(","), search.dept.join(","), search.stage.join(","), search.signoff.join(","), preset, sort, dir]);

  const activeFilterCount =
    riskFilter.size + deptFilter.size + stageFilter.size + signoffFilter.size;

  const toggleArrayParam = (
    key: "risk" | "dept" | "stage" | "signoff",
    value: string,
  ) => {
    navigate({
      to: ".",
      search: (prev: ComplianceSearch) => {
        const cur = new Set(prev[key] ?? []);
        if (cur.has(value)) cur.delete(value);
        else cur.add(value);
        return { ...prev, [key]: Array.from(cur) };
      },
    });
  };

  const clearAll = () =>
    navigate({
      to: ".",
      search: () => ({
        q: "",
        preset: "all",
        risk: [],
        dept: [],
        stage: [],
        signoff: [],
        sort: "priority",
        dir: "desc",
      }),
    });

  // ---- Keyboard navigation --------------------------------------------------
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    if (selectedIndex >= filtered.length) setSelectedIndex(0);
  }, [filtered.length, selectedIndex]);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const onTableKey = (e: React.KeyboardEvent<HTMLTableElement>) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => {
        const next = Math.min(filtered.length - 1, i + 1);
        rowRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => {
        const next = Math.max(0, i - 1);
        rowRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === "Enter") {
      const item = filtered[selectedIndex];
      if (item) {
        e.preventDefault();
        navigate({ to: "/compliance/$itemId", params: { itemId: item.id } });
      }
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Items</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every extracted DPDP requirement, filterable and deep-linkable.
          </p>
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
          {items.length} items
        </div>
      </header>

      {/* Preset tabs */}
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Preset filters">
        {presetValues.map((p) => {
          const active = preset === p;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={active}
              onClick={() => navigate({ to: ".", search: (prev: ComplianceSearch) => ({ ...prev, preset: p }) })}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground/80 hover:bg-muted",
              )}
            >
              {presetLabel[p]}
            </button>
          );
        })}
      </div>

      {/* Search + filter chips */}
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search compliance items"
                placeholder="Search by ID, title, or section (e.g. Section 6(1))"
                className="h-9 pl-8"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
              />
              {qLocal && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQLocal("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Sort</span>
              <Button
                size="sm"
                variant={sort === "priority" ? "secondary" : "ghost"}
                className="h-8 px-2 text-xs"
                onClick={() =>
                  navigate({ to: ".", search: (prev: ComplianceSearch) => ({ ...prev, sort: "priority" }) })
                }
              >
                Priority
              </Button>
              <Button
                size="sm"
                variant={sort === "activity" ? "secondary" : "ghost"}
                className="h-8 px-2 text-xs"
                onClick={() =>
                  navigate({ to: ".", search: (prev: ComplianceSearch) => ({ ...prev, sort: "activity" }) })
                }
              >
                Last activity
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0"
                aria-label={dir === "asc" ? "Sort descending" : "Sort ascending"}
                onClick={() =>
                  navigate({
                    to: ".",
                    search: (prev: ComplianceSearch) => ({ ...prev, dir: dir === "asc" ? "desc" : "asc" }),
                  })
                }
              >
                {dir === "asc" ? (
                  <ArrowUpAZ className="h-4 w-4" />
                ) : (
                  <ArrowDownAZ className="h-4 w-4" />
                )}
              </Button>
            </div>
            {(activeFilterCount > 0 || qLocal || preset !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs"
                onClick={clearAll}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <FilterRow label="Risk">
            {riskValues.map((r) => (
              <FilterChip
                key={r}
                active={riskFilter.has(r)}
                onClick={() => toggleArrayParam("risk", r)}
              >
                <RiskBadge value={r} />
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Department">
            {deptValues.map((d) => (
              <FilterChip
                key={d}
                active={deptFilter.has(d)}
                onClick={() => toggleArrayParam("dept", d)}
              >
                <DepartmentBadge value={d} />
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Stage">
            {stageValues.map((s) => (
              <FilterChip
                key={s}
                active={stageFilter.has(s)}
                onClick={() => toggleArrayParam("stage", s)}
              >
                <StatusBadge value={s} />
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Sign-off">
            {signoffValues.map((s) => (
              <FilterChip
                key={s}
                active={signoffFilter.has(s)}
                onClick={() => toggleArrayParam("signoff", s)}
              >
                <SignoffBadge value={s} />
              </FilterChip>
            ))}
          </FilterRow>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-status-critical">
            <AlertOctagon className="h-4 w-4" /> Failed to load — retry once the fixture layer is
            reachable.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <div className="text-sm font-medium">No items match these filters.</div>
            <p className="text-sm text-muted-foreground">
              Try removing a filter or clearing your search.
            </p>
            <Button size="sm" variant="secondary" onClick={clearAll}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-hidden rounded-md">
            <table
              className="w-full text-left text-sm outline-none"
              tabIndex={0}
              onKeyDown={onTableKey}
              aria-label="Compliance items"
            >
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th>ID</Th>
                  <Th>Requirement</Th>
                  <Th>Section</Th>
                  <Th>Priority</Th>
                  <Th>Impacted</Th>
                  <Th>Stage</Th>
                  <Th>Owner</Th>
                  <Th>Sign-off</Th>
                  <Th>Last activity</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => {
                  const selected = idx === selectedIndex;
                  const blocked = isBlocked(i);
                  const worstSignoff: Signoff = i.impacts.some(
                    (im) => im.signoff === "changes_requested",
                  )
                    ? "changes_requested"
                    : i.impacts.every((im) => im.signoff === "approved")
                      ? "approved"
                      : "pending";
                  return (
                    <tr
                      key={i.id}
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      tabIndex={-1}
                      role="link"
                      aria-selected={selected}
                      onClick={() =>
                        navigate({ to: "/compliance/$itemId", params: { itemId: i.id } })
                      }
                      onFocus={() => setSelectedIndex(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          navigate({
                            to: "/compliance/$itemId",
                            params: { itemId: i.id },
                          });
                        }
                      }}
                      className={cn(
                        "cursor-pointer border-t border-border align-top outline-none transition-colors",
                        "hover:bg-muted/60",
                        selected && "bg-primary/5",
                        "focus:bg-primary/10",
                      )}
                    >
                      <Td className="font-mono text-xs tabular-nums text-muted-foreground">
                        {i.id}
                      </Td>
                      <Td>
                        <div className="font-medium leading-snug">{i.title}</div>
                        {blocked && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-status-unknown">
                            <HelpCircle className="h-3 w-3" /> Blocked · needs human decision
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs text-muted-foreground">
                        {i.source?.section ?? "—"}
                      </Td>
                      <Td>
                        <RiskBadge value={i.risk} />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {i.departments.map((d) => (
                            <DepartmentBadge key={d} value={d} />
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <StatusBadge value={i.status} />
                      </Td>
                      <Td className="text-xs text-foreground/80">{i.owner ?? "—"}</Td>
                      <Td>
                        <SignoffBadge value={worstSignoff} />
                      </Td>
                      <Td className="text-xs tabular-nums text-muted-foreground">
                        {formatRelative(new Date(lastActivityTs(i)).toISOString())}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Tip: use ↑/↓ to move selection and Enter to open. Every filter is reflected in the URL — copy
        this address to share the current view.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5", className)}>{children}</td>;
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
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
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-1.5 py-0.5 transition-colors",
        active ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
