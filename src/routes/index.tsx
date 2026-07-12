import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { CookieConsent } from "@/components/CookieConsent";
import { submitDemoRequest, type DemoRequestResult } from "@/lib/demo-request";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RegulatoryFabric | Compliance infrastructure for any regulation" },
      {
        name: "description",
        content:
          "RegulatoryFabric reads a regulation, works out which obligations apply to your company, and tells each team what to fix.",
      },
      {
        property: "og:title",
        content: "RegulatoryFabric | Compliance infrastructure for any regulation",
      },
      {
        property: "og:description",
        content:
          "RegulatoryFabric reads a regulation, works out which obligations apply to your company, and tells each team what to fix.",
      },
    ],
  }),
  component: Landing,
});

/* -------------------------------------------------------------------------
   Shared type. The display face runs at weight 300 with negative tracking,
   which is what carries the light-institutional register. Risk colours
   (critical / high / ok / unknown) are reserved for status and are never
   used decoratively.
   ------------------------------------------------------------------------- */

// The Test Room lives outside this app, so it opens in its own tab.
const TEST_ROOM_URL = "https://compliance-disco-production.up.railway.app";

const EYEBROW = "font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-primary";
const DISPLAY_LG =
  "text-balance text-[27px] font-light leading-[1.16] tracking-[-0.9px] text-foreground sm:text-4xl";
const BODY = "max-w-[58ch] text-[15.5px] leading-[1.65] text-muted-foreground";

function BrandMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-5 shrink-0">
      <path
        d="M3 6h14M3 10h14M3 14h14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M6 3v14M10 3v14M14 3v14"
        className="stroke-primary"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   The one visual on the page: a static, cleaned-up Command Center.
   The numbers match the DPDP fixture set, and the escalated item is the
   whole argument of the page, so it stays.
   ------------------------------------------------------------------------- */

type Status = "critical" | "high" | "ok" | "unknown";

const STATUS_STYLES: Record<Status, string> = {
  critical: "bg-status-critical/10 text-status-critical",
  high: "bg-status-high/10 text-status-high",
  ok: "bg-status-ok/10 text-status-ok",
  unknown: "border border-dashed border-status-unknown text-status-unknown",
};

function Tag({ status, children }: { status: Status; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-medium ${STATUS_STYLES[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 bg-current ${status === "unknown" ? "rounded-[1px]" : "rounded-full"}`}
      />
      {children}
    </span>
  );
}

const KPIS = [
  { n: "10", label: "Obligations found", flag: false },
  { n: "1", label: "Needs your decision", flag: true },
  { n: "5", label: "High priority", flag: false },
  { n: "2", label: "Signed off", flag: false },
];

const ROWS: Array<{ id: string; title: string; cite: string; status: Status; label: string }> = [
  {
    id: "DPDP-003",
    title: "Personal data breach response",
    cite: "s.8(6)",
    status: "critical",
    label: "Escalated",
  },
  {
    id: "DPDP-001",
    title: "Consent before promotional email",
    cite: "s.6(1)",
    status: "high",
    label: "Ready for review",
  },
  {
    id: "DPDP-008",
    title: "Sharing audiences with ad platforms",
    cite: "s.8(2)",
    status: "unknown",
    label: "Unknown",
  },
  {
    id: "DPDP-006",
    title: "Cookie and tracking consent",
    cite: "s.6(1)",
    status: "ok",
    label: "Signed off",
  },
];

const GRID = "grid grid-cols-[1fr_auto] gap-x-3.5 gap-y-1.5 md:grid-cols-[74px_1fr_92px_108px]";

function CommandCenterMock() {
  return (
    <div
      role="img"
      aria-label="Command Center showing ten DPDP obligations, one of which has been escalated to a human."
      className="mt-14 w-full overflow-hidden rounded-t-2xl border border-border bg-card text-left shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <i className="block size-2.5 rounded-full bg-border" />
          <i className="block size-2.5 rounded-full bg-border" />
          <i className="block size-2.5 rounded-full bg-border" />
        </div>
        <div className="inline-flex items-center gap-2 text-[13px] text-foreground">
          DPDP Act 2023
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
            Pack v1.0
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div
              key={k.label}
              className={`flex flex-col gap-1.5 rounded-xl border p-4 ${
                k.flag ? "border-status-critical bg-status-critical/5" : "border-border"
              }`}
            >
              <span
                className={`text-[27px] font-light leading-none tracking-[-1px] tabular-nums ${
                  k.flag ? "text-status-critical" : "text-foreground"
                }`}
              >
                {k.n}
              </span>
              <span className="text-[12.5px] leading-tight text-muted-foreground">{k.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          <div
            className={`${GRID} hidden border-b border-border px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground/70 md:grid`}
          >
            <span>Item</span>
            <span>Obligation</span>
            <span>Source</span>
            <span>Status</span>
          </div>

          {ROWS.map((r) => (
            <div key={r.id} className={`${GRID} items-center border-b border-border/60 px-1 py-3`}>
              <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
              <span className="order-first col-span-2 text-[14.5px] text-foreground md:order-none md:col-span-1">
                {r.title}
              </span>
              <span className="font-mono text-xs text-primary">{r.cite}</span>
              <span className="justify-self-end md:justify-self-start">
                <Tag status={r.status}>{r.label}</Tag>
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-l-[3px] border-status-critical bg-status-critical/5 px-4 py-3">
          <b className="text-[13px] font-semibold text-status-critical">DPDP-003 was not scored.</b>
          <p className="mt-1 text-[13px] leading-[1.55] text-foreground/80">
            The breach runbook has no path for notifying affected people. That is a critical gap, so
            it went to the compliance officer instead of getting a status.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Demo form ------------------------------- */

type FormState = "idle" | "sending" | "sent" | "error";

function DemoForm() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? ""),
      regulations: String(form.get("regulations") ?? ""),
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""), // honeypot
    };

    try {
      const result: DemoRequestResult = await submitDemoRequest({ data: payload });
      if (result.ok) {
        setState("sent");
      } else {
        setError(result.error);
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-status-ok bg-status-ok/5 px-6 py-8 text-center">
        <b className="block text-[17px] font-medium text-foreground">
          Thanks. We have your request.
        </b>
        <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
          We&apos;ll be in touch within a couple of working days.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2.5 text-[14.5px] text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
  const label = "font-mono text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground/80";

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className={field}
            placeholder="Priya Nair"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
            placeholder="priya@company.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="company">
            Company
          </label>
          <input
            id="company"
            name="company"
            required
            autoComplete="organization"
            className={field}
            placeholder="Acme Ltd"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="regulations">
            Which regulations? (optional)
          </label>
          <input id="regulations" name="regulations" className={field} placeholder="DPDP, GDPR" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor="message">
          Anything we should know? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={`${field} min-h-[92px] resize-y`}
          placeholder="What are you trying to get on top of?"
        />
      </div>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] size-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p role="alert" className="text-[13.5px] text-status-critical">
          {error}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-3.5">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-primary px-[18px] py-2.5 text-[15px] text-primary-foreground transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {state === "sending" ? "Sending..." : "Request a demo"}
        </button>
        <span className="text-[12.5px] text-muted-foreground/80">
          We use this to reply to you. Nothing else.
        </span>
      </div>
    </form>
  );
}

/* -------------------------------- Content -------------------------------- */

const AUDIENCES = [
  {
    role: "Compliance officers",
    body: "The whole programme on one screen: what the law asks for, who it lands on, what is blocked, and what has been signed off. Anything the system would not decide comes straight to you, with the evidence attached.",
  },
  {
    role: "Department teams",
    body: "Engineering and marketing never get sent legal text. They get the change to make, the person who owns it, the deadline, and what counts as done.",
  },
  {
    role: "Leadership and auditors",
    body: "A formal compliance document built only from findings a human approved. Every line in it walks back to the clause of law it came from.",
  },
];

const FEATURES = [
  {
    title: "Bring any regulation",
    body: "Regulations load as versioned packs. DPDP, GDPR, HIPAA and your own internal policies all use the same format, so adding one is a configuration change rather than an engineering project.",
  },
  {
    title: "It checks whether a rule applies to you first",
    body: "Jurisdiction, entity type, channel, effective date. If a rule does not apply, it says so and stops. If it cannot tell, it asks rather than guessing.",
  },
  {
    title: "Gaps are measured against what you actually do",
    body: "It reads your real practice records, not your policy documents, and quotes the exact field that failed. You can argue with a finding like that, which is the point.",
  },
  {
    title: "Nothing loses its citation",
    body: "Every obligation carries the sentence of law behind it and the version of the pack it came from, all the way through to the final document.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1060px] items-center gap-8 px-6">
          <a
            href="#top"
            className="mr-auto flex items-center gap-2.5 text-base font-medium tracking-[-0.3px] text-foreground"
          >
            <BrandMark />
            RegulatoryFabric
          </a>
          <div className="hidden gap-6 md:flex">
            <a href="#who" className="text-sm text-muted-foreground hover:text-foreground">
              Who it&apos;s for
            </a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground">
              Trust
            </a>
            <a
              href={TEST_ROOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Test Room
            </a>
          </div>
          <Link
            to="/app"
            className="rounded-full border border-border bg-card px-[18px] py-2.5 text-[15px] leading-none text-primary shadow-sm transition hover:bg-muted"
          >
            Demo Dashboard
          </Link>
        </div>
      </nav>

      <header id="top" className="relative overflow-hidden pt-[92px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-20%] top-[-220px] h-[680px] blur-lg"
          style={{
            background:
              "radial-gradient(46% 42% at 22% 34%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 68%), radial-gradient(40% 40% at 76% 22%, color-mix(in srgb, var(--chart-2) 12%, transparent), transparent 66%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1060px] flex-col items-center gap-5 px-6 text-center">
          <p className={EYEBROW}>Compliance infrastructure</p>
          <h1 className="max-w-[16ch] text-balance text-[38px] font-light leading-[1.05] tracking-[-1.6px] text-foreground sm:text-6xl">
            Know where you stand on&nbsp;any regulation.
          </h1>
          <p className="max-w-[54ch] text-[19px] font-light leading-[1.6] text-muted-foreground">
            RegulatoryFabric reads a regulation, works out which obligations apply to your company,
            and tells each team what to fix.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/app"
              className="rounded-full bg-primary px-[18px] py-2.5 text-[15px] leading-none text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Demo Dashboard
            </Link>
            <a
              href={TEST_ROOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-[18px] py-2.5 text-[15px] leading-none text-primary shadow-sm transition hover:bg-muted"
            >
              Test Room
              <svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className="size-3 shrink-0 opacity-70"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 2h5.5v5.5M10 2 4 8M8 10H2V4" />
              </svg>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a href="#demo" className="px-1 text-[15px] text-primary hover:opacity-80">
              Request a demo &rarr;
            </a>
          </div>

          <CommandCenterMock />

          <p className="mx-auto mt-4 max-w-[56ch] text-[13px] text-muted-foreground/80">
            One regulation, ten obligations, and the one item the system would not decide on its
            own.
          </p>
        </div>
      </header>

      <section id="who" className="py-[92px]">
        <div className="mx-auto max-w-[1060px] px-6">
          <div className="mb-11 flex max-w-[620px] flex-col gap-3.5">
            <p className={EYEBROW}>Who it&apos;s for</p>
            <h2 className={DISPLAY_LG}>Everyone gets the same facts, in their own language.</h2>
            <p className={BODY}>
              A finding means something different to a compliance officer than it does to a
              marketing manager. Most tools publish one report and leave everybody to translate it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.role} className="flex flex-col gap-3">
                <h3 className="border-b border-border pb-3 text-[17px] tracking-[-0.3px] text-foreground">
                  {a.role}
                </h3>
                <p className="text-[15px] leading-[1.65] text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-border/60 bg-muted/30 py-[92px]">
        <div className="mx-auto max-w-[1060px] px-6">
          <div className="mb-11 flex max-w-[620px] flex-col gap-3.5">
            <p className={EYEBROW}>Features</p>
            <h2 className={DISPLAY_LG}>What it does.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-2.5">
                <span aria-hidden="true" className="h-0.5 w-6 rounded-sm bg-primary" />
                <h3 className="text-[16.5px] tracking-[-0.3px] text-foreground">{f.title}</h3>
                <p className="text-[15px] leading-[1.65] text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="py-[92px]">
        <div className="mx-auto grid max-w-[1060px] items-start gap-14 px-6 md:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <p className={EYEBROW}>Trust</p>
            <h2 className={DISPLAY_LG}>It tells you when it doesn&apos;t know.</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-[15px] leading-[1.65] text-muted-foreground">
              A compliance tool that always has an answer is dangerous, because false assurance is
              the thing regulators punish.
            </p>
            <p className="text-[15px] leading-[1.65] text-muted-foreground">
              So when evidence is missing, RegulatoryFabric returns{" "}
              <b className="font-medium text-foreground">unknown</b> rather than a pass. When a gap
              is critical, it hands the call to a named person instead of scoring it. And nothing
              reaches the final document until a human has signed it.
            </p>
            <p className="text-[15px] leading-[1.65] text-muted-foreground">
              You can always see which conclusions came from a machine and which came from a
              colleague.
            </p>
          </div>
        </div>
      </section>

      <section id="demo" className="border-y border-border/60 bg-muted/30 py-[92px]">
        <div className="mx-auto max-w-[1060px] px-6">
          <div className="mx-auto max-w-[620px] rounded-2xl border border-border bg-card p-9 shadow-sm">
            <p className={EYEBROW}>Request a demo</p>
            <h2 className={`${DISPLAY_LG} mt-3`}>Bring your regulation.</h2>
            <p className={`${BODY} mt-2.5`}>
              Tell us which one is keeping you up and we&apos;ll show you what the fabric does with
              it.
            </p>
            <DemoForm />
          </div>
        </div>
      </section>

      <footer className="mt-[92px] border-t border-border py-10">
        <div className="mx-auto flex max-w-[1060px] flex-wrap items-center justify-between gap-5 px-6">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-base font-medium tracking-[-0.3px] text-foreground"
          >
            <BrandMark />
            RegulatoryFabric
          </a>
          <small className="text-[12.5px] text-muted-foreground/80">
            Agent output is labelled as agent-generated and is not legal advice.
          </small>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
}
