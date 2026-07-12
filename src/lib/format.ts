import type {
  AgentKind,
  AssessmentStatus,
  Department,
  ItemStatus,
  Risk,
  Signoff,
} from "@/data/types";

// Locale and timezone are pinned: the server and the browser must produce a
// byte-identical string or React tears the tree down on hydration.
// Callers rely on the "<date>, <time>" shape — see the .split(",") sites.
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const NUMBER = new Intl.NumberFormat("en-GB");

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs === 0 ? `${m}m` : `${m}m ${rs}s`;
}

export const riskLabel: Record<Risk, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const statusLabel: Record<ItemStatus, string> = {
  extracted: "Extracted",
  routed: "Routed",
  analysing: "Analysing",
  review: "Ready for review",
  signed_off: "Signed off",
  implemented: "Implemented",
  in_fdo: "In FDO",
};

export const signoffLabel: Record<Signoff, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export const assessmentLabel: Record<AssessmentStatus, string> = {
  compliant: "Compliant",
  partial: "Partial",
  non_compliant: "Non-compliant",
  unknown: "Unknown — evidence missing",
  not_applicable: "Not applicable",
};

export const departmentLabel: Record<Department, string> = {
  engineering: "Engineering",
  marketing: "Marketing",
};

export const agentLabel: Record<AgentKind, string> = {
  extractor: "Extractor",
  coordinator: "Coordinator",
  engineering: "Engineering Agent",
  marketing: "Marketing Agent",
  composer: "Composer",
};
