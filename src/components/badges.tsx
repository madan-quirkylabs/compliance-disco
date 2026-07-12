import type {
  AgentKind,
  AssessmentStatus,
  Department,
  ItemStatus,
  Risk,
  Signoff,
} from "@/data/types";
import {
  agentLabel,
  assessmentLabel,
  riskLabel,
  signoffLabel,
  statusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  FileText,
  GitBranch,
  HelpCircle,
  Layers,
  MinusCircle,
  User,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";

function Chip({
  children,
  className,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const riskMap: Record<Risk, { cls: string; icon: ReactNode }> = {
  critical: {
    cls: "border-status-critical/40 bg-status-critical/10 text-status-critical",
    icon: <AlertOctagon className="h-3 w-3" />,
  },
  high: {
    cls: "border-status-high/40 bg-status-high/10 text-status-high",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  medium: {
    cls: "border-border bg-muted text-foreground/80",
    icon: <Circle className="h-3 w-3" />,
  },
  low: {
    cls: "border-border bg-muted/60 text-muted-foreground",
    icon: <Circle className="h-3 w-3" />,
  },
};

export function RiskBadge({ value }: { value: Risk }) {
  const m = riskMap[value];
  return (
    <Chip className={m.cls} icon={m.icon}>
      {riskLabel[value]}
    </Chip>
  );
}

export function StatusBadge({ value }: { value: ItemStatus }) {
  return (
    <Chip className="border-border bg-background text-foreground/80" icon={<Layers className="h-3 w-3" />}>
      {statusLabel[value]}
    </Chip>
  );
}

const signoffMap: Record<Signoff, { cls: string; icon: ReactNode }> = {
  pending: {
    cls: "border-border bg-muted text-foreground/80",
    icon: <CircleDashed className="h-3 w-3" />,
  },
  approved: {
    cls: "border-status-ok/40 bg-status-ok/10 text-status-ok",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  changes_requested: {
    cls: "border-status-high/40 bg-status-high/10 text-status-high",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export function SignoffBadge({ value }: { value: Signoff }) {
  const m = signoffMap[value];
  return (
    <Chip className={m.cls} icon={m.icon}>
      {signoffLabel[value]}
    </Chip>
  );
}

const assessmentMap: Record<AssessmentStatus, { cls: string; icon: ReactNode }> = {
  compliant: {
    cls: "border-status-ok/40 bg-status-ok/10 text-status-ok",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  partial: {
    cls: "border-status-high/40 bg-status-high/10 text-status-high",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  non_compliant: {
    cls: "border-status-critical/40 bg-status-critical/10 text-status-critical",
    icon: <AlertOctagon className="h-3 w-3" />,
  },
  // "unknown" gets its own visual language — striped border, muted surface —
  // so it never reads as either a pass or a fail.
  unknown: {
    cls: "border-dashed border-status-unknown bg-status-unknown/10 text-status-unknown font-semibold",
    icon: <HelpCircle className="h-3 w-3" />,
  },
  not_applicable: {
    cls: "border-border bg-muted text-muted-foreground",
    icon: <MinusCircle className="h-3 w-3" />,
  },
};

export function AssessmentBadge({ value }: { value: AssessmentStatus }) {
  const m = assessmentMap[value];
  return (
    <Chip className={m.cls} icon={m.icon}>
      {assessmentLabel[value]}
    </Chip>
  );
}

export function DepartmentBadge({ value }: { value: Department }) {
  const cls =
    value === "engineering"
      ? "border-agent-engineering/40 bg-agent-engineering/10 text-agent-engineering"
      : "border-agent-marketing/40 bg-agent-marketing/10 text-agent-marketing";
  return (
    <Chip className={cls} icon={<GitBranch className="h-3 w-3" />}>
      {value === "engineering" ? "Engineering" : "Marketing"}
    </Chip>
  );
}

export function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <Chip
      className="border-primary/30 bg-primary/10 text-primary"
      title="Agent-generated content · confidence"
    >
      <Bot className="h-3 w-3" /> Agent · {pct}%
    </Chip>
  );
}

const agentIconMap: Record<AgentKind, ReactNode> = {
  extractor: <FileText className="h-3.5 w-3.5" />,
  coordinator: <GitBranch className="h-3.5 w-3.5" />,
  engineering: <Bot className="h-3.5 w-3.5" />,
  marketing: <Wand2 className="h-3.5 w-3.5" />,
  composer: <Check className="h-3.5 w-3.5" />,
};

const agentColor: Record<AgentKind, string> = {
  extractor: "border-agent-extractor/40 bg-agent-extractor/10 text-agent-extractor",
  coordinator: "border-agent-coordinator/40 bg-agent-coordinator/10 text-agent-coordinator",
  engineering: "border-agent-engineering/40 bg-agent-engineering/10 text-agent-engineering",
  marketing: "border-agent-marketing/40 bg-agent-marketing/10 text-agent-marketing",
  composer: "border-agent-composer/40 bg-agent-composer/10 text-agent-composer",
};

export function AgentPill({ kind }: { kind: AgentKind }) {
  return (
    <Chip className={agentColor[kind]} icon={agentIconMap[kind]}>
      {agentLabel[kind]}
    </Chip>
  );
}

export function HumanChip({ name }: { name: string }) {
  return (
    <Chip className="border-border bg-background text-foreground" title="Human action">
      <User className="h-3 w-3" /> {name}
    </Chip>
  );
}
