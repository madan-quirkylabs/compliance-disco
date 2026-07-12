# Compliance-Disco — How It Works (Plain-English Explainer)

*For anyone — no legal or AI background needed.*

## In one sentence

You hand it a regulation (a long, dense legal PDF). It hands back a clear, prioritized
action plan telling each team in your company exactly what to build or change to comply —
and in what order.

## The problem it solves

Every time a new law or regulation lands — a data-protection act, a financial circular, a
privacy rule — someone at the company has to:

1. **Read** dozens of pages of dense legal language.
2. **Figure out** which parts actually apply to the business.
3. **Translate** "the law says X" into "*Engineering* must build Y" and "*Marketing* must change Z."
4. **Prioritize** it all into a plan that leadership can act on.

Today that's slow, manual, and needs expensive specialists. It can take weeks. Compliance-Disco
does the first draft in **minutes**.

> **Analogy:** Imagine a team of tireless consultants who read the entire law overnight. Each
> one writes a to-do list for *their* department. Then a lead consultant merges those lists into
> a single prioritized plan and points out where the departments depend on each other.
> That's exactly what this system automates.

## How it works — the pipeline

The work flows through a series of stages. Each stage does one job and hands its result to the
next — like an assembly line.

```
   📄 Regulation PDF
        │
        ▼
  ┌───────────────┐
  │  1. READ      │   Convert the PDF into plain text a machine can work with.
  └───────┬───────┘
          ▼
  ┌───────────────┐
  │  2. EXTRACT   │   An AI reads the text and pulls out the structured "obligations":
  └───────┬───────┘   each rule, who it applies to, deadlines, and penalties.
          │
          ▼           ← the obligations become the shared input for the next stage
     ┌────┴────┐
     ▼         ▼
 ┌────────┐ ┌────────┐
 │ 3a.    │ │ 3b.    │   Two "department expert" agents work in parallel. Each acts like a
 │  ENG   │ │  MKT   │   Product Manager for its team: it turns the obligations into concrete
 │ agent  │ │ agent  │   requirements — what to build/change, acceptance criteria, priority.
 └────┬───┘ └───┬────┘
      └────┬────┘
           ▼
  ┌───────────────┐
  │ 4. CONSOLIDATE│   A final agent merges both department lists into ONE executive report:
  └───────┬───────┘   a single prioritized plan + where the teams depend on each other.
          ▼
   📋 Final Report  →  "Here's what to do, who does it, and in what order."
```

**The stages in plain words:**

1. **Read** — The regulation arrives as a PDF (often scanned legal text). We convert it to plain
   text so software can process it.
2. **Extract** — An AI model reads the text and produces a clean, structured list of *obligations*
   — the individual rules the regulation imposes, each tagged with what it requires, who it applies
   to, and any deadlines or penalties. This is regulation-agnostic: it works for any regulator's document.
3. **Translate per department** — Two specialist agents each read that same list of obligations and,
   acting like a Product Manager for their team, write a focused **requirements document**:
   - **Engineering agent** → what systems, controls, and code the tech team must build.
   - **Marketing agent** → what customer-facing practices (emails, forms, ad targeting) must change.
   - *(More departments — Sales, Legal, HR — can be added the same way.)*
4. **Consolidate** — A final agent merges the two documents into a single **executive report**: a
   prioritized action table, and — crucially — the *cross-cutting dependencies* (e.g., "both teams
   rely on the same consent service, so build that first").

## A concrete example

Take **one** obligation from India's DPDP Act: *"Get clear, per-purpose consent before using
someone's personal data, and let them withdraw it just as easily."*

Here's what the pipeline produces from that single rule:

| Stage | Output |
|---|---|
| **Extract** | Obligation `D-05`: itemised consent per purpose; easy withdrawal. |
| **Engineering** | `REQ-1`: *Build a `consent-svc` microservice* with grant/withdraw APIs and an audit log. **Priority: P0.** |
| **Marketing** | `MREQ-1`: *Redesign every signup form* with separate, unticked consent checkboxes per purpose. **Priority: P0.** |
| **Consolidate** | Notes that Marketing's forms **depend on** Engineering's consent service — so it flags `consent-svc` as the critical thing to build first. |

That last insight — spotting that two departments hinge on one shared component — is the kind of
thing that usually takes a human coordinator days to notice. The system surfaces it automatically.

## What you get (the deliverables)

Three plain-Markdown files anyone can open and read:

| File | What's in it |
|---|---|
| `engineering-requirements.md` | Numbered engineering requirements (`REQ-1…`), each with the rule it satisfies, acceptance criteria, priority, and affected systems. |
| `marketing-requirements.md` | Numbered marketing requirements (`MREQ-1…`), same format, mapped to channels (email, SMS, ad targeting…). |
| `final-report.md` | The executive summary: a consolidated priority table (P0/P1/P2), cross-department dependencies, and a recommended sequence. |

## The engine behind it (the tech, briefly)

- **The "brain"** is a large AI model (**DeepSeek**) that does the reading, extracting, and writing.
- **The "body"** is **Hermes Agent** — an open-source runtime that lets us run each stage as an
  independent AI *agent* with one specific job, its own instructions, and the ability to read and
  write files.
- The stages don't talk to a database — they simply **pass files to each other** (a "handoff"),
  which keeps the whole system simple, transparent, and easy to inspect. You can open any
  intermediate file at any point and see exactly what the pipeline was thinking.

Two design choices worth knowing:

- **Regulation-agnostic:** the same pipeline works for *any* regulator (data protection, finance,
  telecom…) — you just feed it a different PDF.
- **Modular:** adding a new department (e.g., a Sales agent) is just adding one more "expert" that
  reads the same obligations and writes its own requirements. Nothing else changes.

## How to run it

The whole pipeline is one command:

```bash
./run_pipeline.sh
```

That runs the engineering agent, the marketing agent, and the consolidator in sequence, and leaves
the final report at `workspace/shared-data/consolidated-output/final-report.md`. Each department
agent can also be run on its own (`./run_engineering.sh`, `./run_marketing.sh`).

*Prerequisite: a one-time setup that configures the AI model (an API key). After that, it just runs.*

---

**The big idea:** turn a wall of legal text into a clear, prioritized, per-team action plan —
automatically — so people spend their time *doing* the compliance work, not *deciphering* it.
