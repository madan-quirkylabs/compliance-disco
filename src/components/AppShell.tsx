import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  FileCheck2,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PlayCircle,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useViewMode, viewModeLabel, type ViewMode } from "@/lib/view-mode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NavItem = {
  link: LinkProps;
  // Resolved URL, used only for the active-state check.
  href: string;
  label: string;
  icon: LucideIcon;
};

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ link: { to: "/" }, href: "/", label: "Command Center", icon: LayoutDashboard }],
  },
  {
    label: "Compliance",
    items: [
      {
        link: { to: "/compliance" },
        href: "/compliance",
        label: "Compliance Items",
        icon: ListChecks,
      },
    ],
  },
  {
    label: "Departments",
    items: [
      {
        link: { to: "/departments/$dept", params: { dept: "engineering" } },
        href: "/departments/engineering",
        label: "Engineering",
        icon: Wrench,
      },
      {
        link: { to: "/departments/$dept", params: { dept: "marketing" } },
        href: "/departments/marketing",
        label: "Marketing",
        icon: Megaphone,
      },
    ],
  },
  {
    label: "System",
    items: [
      { link: { to: "/runs" }, href: "/runs", label: "Agent Runs", icon: Activity },
      { link: { to: "/fdo" }, href: "/fdo", label: "FDO Preview", icon: FileCheck2 },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mode, setMode } = useViewMode();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Compliance Disco</div>
            <div className="text-[11px] text-muted-foreground">Regulation → FDO</div>
          </div>
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        {...item.link}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
          MVP · Frontend-only fixture
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground/80">
              Regulation
            </span>
            <span className="text-sm font-semibold">DPDP Act, 2023 · India</span>
          </div>
          <div className="mx-3 hidden h-4 w-px bg-border md:block" />
          <RunStatusPill />
          <div className="mx-3 hidden h-4 w-px bg-border md:block" />
          <div className="hidden text-xs tabular-nums text-muted-foreground md:block">
            Updated 12 Jul 2026, 09:30
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
              <SelectTrigger className="h-8 w-[220px] text-xs" aria-label="View as">
                <SelectValue placeholder="View as" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cco">View as: {viewModeLabel.cco}</SelectItem>
                <SelectItem value="engineering">View as: {viewModeLabel.engineering}</SelectItem>
                <SelectItem value="marketing">View as: {viewModeLabel.marketing}</SelectItem>
                <SelectItem value="auditor">View as: {viewModeLabel.auditor}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("compliance-disco:replay"));
                toast.success("Replaying the last successful run", {
                  description: "Watch the pipeline stepper animate on the Command Center.",
                });
              }}
            >
              <PlayCircle className="h-4 w-4" /> Replay demo
            </Button>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function RunStatusPill() {
  return (
    <div
      className="hidden items-center gap-2 rounded-md border border-status-ok/40 bg-status-ok/10 px-2 py-1 md:flex"
      role="status"
      aria-label="Latest run status"
    >
      <span className="h-2 w-2 rounded-full bg-status-ok" aria-hidden />
      <span className="text-xs font-medium text-status-ok">Latest run: completed</span>
      <span className="text-xs text-status-ok/80">· 1 escalation</span>
    </div>
  );
}
