import { createFileRoute } from "@tanstack/react-router";
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
      <div className="rounded-xl border border-status-ok/30 bg-status-ok/5 p-8 text-center">
        <p className="text-lg font-medium text-foreground">Thanks. We have your request.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          We'll be in touch within a couple of working days. If it's urgent, reply to the
          confirmation and it will come straight to us.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const label = "block text-xs font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="name">Name</label>
          <input id="name" name="name" required autoComplete="name" className={field} placeholder="Priya Nair" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={field} placeholder="priya@company.com" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="company">Company</label>
          <input id="company" name="company" required autoComplete="organization" className={field} placeholder="Acme Ltd" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={label} htmlFor="regulations">Which regulations? (optional)</label>
          <input id="regulations" name="regulations" className={field} placeholder="DPDP, GDPR" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor="message">Anything we should know? (optional)</label>
        <textarea id="message" name="message" rows={4} className={field} placeholder="What are you trying to get on top of?" />
      </div>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p role="alert" className="text-sm text-status-critical">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {state === "sending" ? "Sending…" : "Request a demo"}
        </button>
        <p className="text-xs text-muted-foreground">
          We use this to reply to you. Nothing else.
        </p>
      </div>
    </form>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-5xl px-6 pt-24 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-primary">
          Compliance infrastructure
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-light leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Know where you stand on any regulation.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-muted-foreground">
          RegulatoryFabric reads a regulation, works out which obligations apply to your company,
          and tells each team what to fix.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a
            href="#demo"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Request a demo
          </a>
        </div>
      </header>

      <section id="demo" className="mx-auto max-w-2xl px-6 py-24">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <h2 className="text-2xl font-light tracking-tight text-foreground">Request a demo</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Tell us which regulation is keeping you up and we'll show you what the fabric does with
            it.
          </p>
          <div className="mt-8">
            <DemoForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <span className="text-sm font-medium text-foreground">RegulatoryFabric</span>
          <span className="text-xs text-muted-foreground">
            Agent output is labelled as agent-generated and is not legal advice.
          </span>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
}
