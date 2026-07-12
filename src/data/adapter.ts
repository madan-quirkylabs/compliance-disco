// The single data seam for Compliance Disco.
// Every UI read goes through here. Fixtures are NEVER imported by components.
// Each function is shaped like a Convex query (async, id/args object, plain
// serialisable output) so this file can be swapped for a Convex client later
// without touching the UI.

import { fdo, items, practices, runs } from "./fixtures";
import type {
  ActivityEvent,
  AgentRun,
  ComplianceItem,
  Department,
  DepartmentSummary,
  Fdo,
  FdoSection,
  ItemStatus,
  PracticeRecord,
  Signoff,
} from "./types";


const delay = <T,>(v: T, ms = 30): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), ms));

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// -----------------------------------------------------------------------------
// Local overrides — persisted human actions layered on top of the fixture store.
// Kept inside the adapter so components remain fixture-agnostic.
// -----------------------------------------------------------------------------
const OVERRIDES_KEY = "compliance-disco/overrides/v1";
const PRACTICE_KEY = "compliance-disco/practice-decisions/v1";

interface ItemOverride {
  events?: ActivityEvent[];
  deptSignoff?: Partial<Record<Department, Signoff>>;
  status?: ItemStatus;
}
type OverrideMap = Record<string, ItemOverride>;

export type PracticeDecision =
  | "approved_recommendation"
  | "overridden_allow"
  | "more_evidence_requested";

export interface PracticeDecisionRecord {
  practice_id: string;
  decision: PracticeDecision;
  actor: string;
  note?: string;
  at: string;
}
type PracticeDecisionMap = Record<string, PracticeDecisionRecord>;


function readOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function applyOverride(item: ComplianceItem, ov?: ItemOverride): ComplianceItem {
  if (!ov) return item;
  const impacts = item.impacts.map((im) =>
    ov.deptSignoff?.[im.department]
      ? { ...im, signoff: ov.deptSignoff[im.department]! }
      : im,
  );
  const activity = ov.events && ov.events.length
    ? [...item.activity, ...ov.events]
    : item.activity;
  const status = ov.status ?? item.status;
  return { ...item, impacts, activity, status };
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------
export async function getComplianceItems(): Promise<ComplianceItem[]> {
  const ov = readOverrides();
  return delay(items.map((i) => applyOverride(clone(i), ov[i.id])));
}

export async function getComplianceItem(id: string): Promise<ComplianceItem | null> {
  const found = items.find((i) => i.id === id);
  if (!found) return delay(null);
  const ov = readOverrides();
  return delay(applyOverride(clone(found), ov[id]));
}

export async function getPracticeRecords(): Promise<PracticeRecord[]> {
  return delay(clone(practices));
}

export async function getPracticeRecord(id: string): Promise<PracticeRecord | null> {
  const found = practices.find((p) => p.practice_id === id);
  return delay(found ? clone(found) : null);
}

export async function getAgentRuns(): Promise<AgentRun[]> {
  return delay(clone(runs));
}

export async function getAgentRun(id: string): Promise<AgentRun | null> {
  const found = runs.find((r) => r.id === id);
  return delay(found ? clone(found) : null);
}

export async function getFdo(): Promise<Fdo> {
  return delay(clone(fdo));
}

// -----------------------------------------------------------------------------
// Composed FDO — derived from compliance items so it reflects any human
// approvals / status changes the user has made in the app.
// -----------------------------------------------------------------------------
export interface ComposedFdo {
  regulation: string;
  scope: string;
  updatedAt: string;
  executive: string;
  orgObligations: FdoSection[];
  engineeringActions: FdoSection[];
  marketingActions: FdoSection[];
  responsibilityMatrix: {
    itemId: string;
    section: string;
    title: string;
    owner: string;
    department: Department;
    dueDate: string;
    signoff: Signoff;
  }[];
  openRisks: {
    itemId: string;
    title: string;
    reason: string;
    kind: "escalation" | "unknown" | "non_compliant";
    department: Department;
    decisionRequired?: string;
    escalatedTo?: string;
  }[];
  citations: { section: string; itemId: string; title: string }[];
  signoffByDepartment: { department: Department; state: Signoff; owner: string; at?: string; actor?: string }[];
  itemCount: number;
  signedOffCount: number;
}

export async function getComposedFdo(): Promise<ComposedFdo> {
  const all = await getComplianceItems();
  const fdoSignoffs = readFdoSignoffs();

  const toSection = (i: ComplianceItem): FdoSection => ({
    id: i.id,
    title: `${i.source?.section ? i.source.section + " — " : ""}${i.title}`,
    body: i.fdoSection,
    itemIds: [i.id],
  });

  const orgObligations = all.filter((i) => i.departments.length > 1).map(toSection);
  const engineeringActions = all
    .filter((i) => i.departments.includes("engineering") && !i.departments.includes("marketing"))
    .map(toSection);
  const marketingActions = all
    .filter((i) => i.departments.includes("marketing") && !i.departments.includes("engineering"))
    .map(toSection);

  const responsibilityMatrix = all.flatMap((i) =>
    i.impacts.map((im) => ({
      itemId: i.id,
      section: i.source?.section ?? "—",
      title: i.title,
      owner: im.owner,
      department: im.department,
      dueDate: im.dueDate,
      signoff: im.signoff,
    })),
  );

  const openRisks = all.flatMap((i) =>
    i.impacts
      .filter(
        (im) =>
          im.escalation ||
          im.assessmentStatus === "unknown" ||
          (im.assessmentStatus === "non_compliant" && im.signoff !== "approved"),
      )
      .map((im) => ({
        itemId: i.id,
        title: i.title,
        reason: im.escalation?.reason ?? im.gap,
        kind: im.escalation
          ? ("escalation" as const)
          : im.assessmentStatus === "unknown"
            ? ("unknown" as const)
            : ("non_compliant" as const),
        department: im.department,
        decisionRequired: im.escalation?.decisionRequired,
        escalatedTo: im.escalation?.escalatedTo,
      })),
  );

  const citations = all
    .filter((i) => i.source)
    .map((i) => ({ section: i.source!.section, itemId: i.id, title: i.title }));

  const signedOffCount = all.filter(
    (i) => i.status === "signed_off" || i.status === "implemented" || i.status === "in_fdo",
  ).length;

  const executive =
    `This document consolidates ${all.length} DPDP obligations extracted from the Act and analysed by the multi-agent system. ` +
    `${signedOffCount} have been signed off; ${all.length - signedOffCount} remain in remediation. ` +
    `${openRisks.filter((r) => r.kind === "escalation").length} decision(s) are pending with the CCO, and ` +
    `${openRisks.filter((r) => r.kind === "unknown").length} assessment(s) returned unknown due to missing or stale evidence. ` +
    `Nothing in this document is marked compliant without both a matching control and evidence on file.`;

  const departments: Department[] = ["engineering", "marketing"];
  const signoffByDepartment = departments.map((d) => {
    const persisted = fdoSignoffs[d];
    if (persisted) return { department: d, ...persisted };
    // Fall back to derived: approved iff every impact for this dept is approved.
    const scoped = all.filter((i) => i.departments.includes(d));
    const allApproved =
      scoped.length > 0 &&
      scoped.every((i) => i.impacts.find((im) => im.department === d)?.signoff === "approved");
    return {
      department: d,
      state: (allApproved ? "approved" : "pending") as Signoff,
      owner: d === "engineering" ? "Arjun Rao (Engineering Lead)" : "Rhea Bhatt (Marketing Lead)",
    };
  });

  return delay({
    regulation: "Digital Personal Data Protection Act, 2023 (India)",
    scope:
      "Processing of digital personal data of individuals in India by the organisation and its processors, across product, engineering and marketing surfaces.",
    updatedAt: new Date().toISOString(),
    executive,
    orgObligations,
    engineeringActions,
    marketingActions,
    responsibilityMatrix,
    openRisks,
    citations,
    signoffByDepartment,
    itemCount: all.length,
    signedOffCount,
  });
}

// -----------------------------------------------------------------------------
// FDO department sign-offs — persisted CCO/Legal approvals of the composed doc.
// -----------------------------------------------------------------------------
const FDO_SIGNOFF_KEY = "compliance-disco/fdo-signoffs/v1";

interface FdoSignoffRecord {
  state: Signoff;
  owner: string;
  actor: string;
  at: string;
}
type FdoSignoffMap = Partial<Record<Department, FdoSignoffRecord>>;

function readFdoSignoffs(): FdoSignoffMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FDO_SIGNOFF_KEY);
    return raw ? (JSON.parse(raw) as FdoSignoffMap) : {};
  } catch {
    return {};
  }
}

function writeFdoSignoffs(map: FdoSignoffMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FDO_SIGNOFF_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export async function setFdoSignoff(args: {
  department: Department;
  state: Signoff;
  actor: string;
}): Promise<void> {
  const map = readFdoSignoffs();
  const owner =
    args.department === "engineering"
      ? "Arjun Rao (Engineering Lead)"
      : "Rhea Bhatt (Marketing Lead)";
  map[args.department] = { state: args.state, owner, actor: args.actor, at: new Date().toISOString() };
  writeFdoSignoffs(map);
  return delay(undefined);
}

export async function clearFdoSignoffs(): Promise<void> {
  writeFdoSignoffs({});
  return delay(undefined);
}


export async function getDepartmentSummary(dept: Department): Promise<DepartmentSummary> {
  const all = await getComplianceItems();
  const scoped = all.filter((i) => i.departments.includes(dept));
  const applicable = scoped.length;
  const highRisk = scoped.filter((i) => i.risk === "high" || i.risk === "critical").length;
  const signedOff = scoped.filter(
    (i) => i.status === "signed_off" || i.status === "implemented" || i.status === "in_fdo",
  ).length;
  const awaitingResponse = scoped.filter((i) =>
    i.impacts.some((im) => im.department === dept && im.signoff !== "approved"),
  ).length;
  const readinessPct = applicable === 0 ? 0 : Math.round((signedOff / applicable) * 100);
  return delay({
    department: dept,
    readinessPct,
    applicable,
    highRisk,
    awaitingResponse,
    signedOff,
    itemIds: scoped.map((i) => i.id),
  });
}

// -----------------------------------------------------------------------------
// Mutations — write to localStorage only. Callers should invalidate the
// TanStack Query cache after these resolve.
// -----------------------------------------------------------------------------
export async function appendHumanAction(args: {
  itemId: string;
  actor: string;
  action: string;
  summary?: string;
}): Promise<ActivityEvent> {
  const evt: ActivityEvent = {
    id: `h-${Date.now()}`,
    actorType: "human",
    actor: args.actor,
    timestamp: new Date().toISOString(),
    action: args.action,
    summary: args.summary ?? "",
  };
  const map = readOverrides();
  const ov = map[args.itemId] ?? {};
  ov.events = [...(ov.events ?? []), evt];
  map[args.itemId] = ov;
  writeOverrides(map);
  return delay(evt);
}

export async function setDepartmentSignoff(args: {
  itemId: string;
  department: Department;
  signoff: Signoff;
}): Promise<void> {
  const map = readOverrides();
  const ov = map[args.itemId] ?? {};
  ov.deptSignoff = { ...(ov.deptSignoff ?? {}), [args.department]: args.signoff };
  map[args.itemId] = ov;
  writeOverrides(map);
  return delay(undefined);
}

export async function setItemStatus(args: {
  itemId: string;
  status: ItemStatus;
}): Promise<void> {
  const map = readOverrides();
  const ov = map[args.itemId] ?? {};
  ov.status = args.status;
  map[args.itemId] = ov;
  writeOverrides(map);
  return delay(undefined);
}

export async function resetItemOverrides(itemId: string): Promise<void> {
  const map = readOverrides();
  delete map[itemId];
  writeOverrides(map);
  return delay(undefined);
}

// -----------------------------------------------------------------------------
// Practice decisions — CCO responses to Marketing Agent escalations.
// -----------------------------------------------------------------------------
function readPracticeDecisions(): PracticeDecisionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PRACTICE_KEY);
    return raw ? (JSON.parse(raw) as PracticeDecisionMap) : {};
  } catch {
    return {};
  }
}

function writePracticeDecisions(map: PracticeDecisionMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRACTICE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export async function getPracticeDecisions(): Promise<PracticeDecisionMap> {
  return delay(readPracticeDecisions());
}

export async function getPracticeDecision(
  practiceId: string,
): Promise<PracticeDecisionRecord | null> {
  const map = readPracticeDecisions();
  return delay(map[practiceId] ?? null);
}

export async function setPracticeDecision(args: {
  practiceId: string;
  decision: PracticeDecision;
  actor: string;
  note?: string;
}): Promise<PracticeDecisionRecord> {
  const map = readPracticeDecisions();
  const rec: PracticeDecisionRecord = {
    practice_id: args.practiceId,
    decision: args.decision,
    actor: args.actor,
    note: args.note,
    at: new Date().toISOString(),
  };
  map[args.practiceId] = rec;
  writePracticeDecisions(map);
  return delay(rec);
}

export async function clearPracticeDecision(practiceId: string): Promise<void> {
  const map = readPracticeDecisions();
  delete map[practiceId];
  writePracticeDecisions(map);
  return delay(undefined);
}

