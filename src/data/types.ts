// Domain model for Compliance Disco.
// All types are plain, serialisable, and adapter-agnostic — this file is
// designed to survive a swap from the fixture adapter to a Convex backend.

export type Department = "engineering" | "marketing";

export type Risk = "critical" | "high" | "medium" | "low";

export type ItemStatus =
  | "extracted"
  | "routed"
  | "analysing"
  | "review"
  | "signed_off"
  | "implemented"
  | "in_fdo";

export type AssessmentStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "unknown"
  | "not_applicable";

export type Signoff = "pending" | "approved" | "changes_requested";

export type AgentKind =
  | "extractor"
  | "coordinator"
  | "engineering"
  | "marketing"
  | "composer";

export interface Source {
  section: string;
  excerpt: string; // verbatim DPDP Act text
  url?: string;
}

export interface Escalation {
  reason: string;
  decisionRequired: string;
  escalatedTo?: string;
}

export interface DepartmentImpact {
  department: Department;
  interpretation: string; // agent's reading of the legal requirement
  currentState: string; // observed current practice
  gap: string; // difference between the two
  requiredActions: string[]; // agent recommendation
  evidenceRequired: string[];
  citedPracticeIds: string[];
  assessmentStatus: AssessmentStatus;
  confidence: number; // 0..1
  owner: string;
  dueDate: string; // ISO date
  signoff: Signoff;
  escalation?: Escalation;
}

export interface ActivityEvent {
  id: string;
  actorType: "agent" | "human";
  actor: string; // display name
  agentKind?: AgentKind; // only when actorType === "agent"
  timestamp: string;
  action: string; // short verb-phrase, e.g. "Produced assessment"
  summary: string;
  confidence?: number;
  reasoning?: string;
  input?: unknown;
  output?: unknown;
  handoffTo?: string;
}

export interface ComplianceItem {
  id: string;
  title: string;
  summary: string; // plain-language, one paragraph
  // `source: null` means we could NOT find a verbatim citation. We never
  // fabricate one. UI must display this state explicitly.
  source: Source | null;
  risk: Risk;
  departments: Department[];
  status: ItemStatus;
  confidence: number; // extractor confidence 0..1
  owner?: string;
  dueDate?: string;
  riskIfIgnored: string;
  applicabilityRationale: string;
  impacts: DepartmentImpact[];
  activity: ActivityEvent[];
  fdoSection: string; // prose this item contributes to the final document
}

export interface PracticeRecord {
  practice_id: string;
  channel: string;
  purpose: string;
  data_collected: string[];
  collection_source: string;
  consent_method: string;
  // `null` means MISSING consent evidence — this is what forces the agent
  // to return `unknown` rather than guess. Stale strings are surfaced via
  // `last_verified_at`.
  consent_evidence: string | null;
  processors: string[];
  retention: string;
  opt_out_process: string;
  owner: string;
  // null means never verified — always triggers escalation.
  last_verified_at: string | null;
}

export interface AgentStep {
  id: string;
  agent: AgentKind;
  status: "completed" | "escalated" | "running" | "failed";
  startedAt: string;
  durationMs: number;
  inputCount: number;
  outputCount: number;
  tokens: number;
  costUsd: number;
  handoffTo?: string;
  input: unknown;
  reasoning: string;
  output: unknown;
  toolCalls: string[];
  sourceFiles: string[];
  escalation?: Escalation;
}


export interface RunEvent {
  timestamp: string;
  agent: AgentKind | "system";
  level: "info" | "warn" | "error" | "escalation";
  message: string;
}

export interface AgentRun {
  id: string;
  status: "completed" | "escalated" | "running" | "failed";
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  steps: AgentStep[];
  events: RunEvent[];
  summary: string;
}

export interface FdoSection {
  id: string;
  title: string;
  body: string;
  itemIds?: string[];
}

export interface Fdo {
  regulation: string;
  scope: string;
  updatedAt: string;
  sections: FdoSection[];
  signoffByDepartment: { department: Department; state: Signoff; owner: string }[];
}

export interface DepartmentSummary {
  department: Department;
  readinessPct: number;
  applicable: number;
  highRisk: number;
  awaitingResponse: number;
  signedOff: number;
  itemIds: string[];
}
