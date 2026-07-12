# 🛡️ Compliance Dashboard — Frontend MVP Spec

> Source: [Notion — Compliance Dashboard — Frontend MVP Spec](https://app.notion.com/p/da5372415e9c4f85871d55f5c28db1cb)

> 🏁 **Buildathon decision:** Build a polished, read-only-first command center around one complete DPDP compliance run. Use seeded/mock data behind a clean data adapter. Prioritize a judge-visible end-to-end story and agent observability over admin features.

## 1. Product goal

Give a Chief Compliance Officer and department stakeholders one place to answer:

- What did the regulation require?
- Which departments are affected?
- What did each agent conclude?
- What is blocked, awaiting review, or signed off?
- How did the system reach its output?
- What will appear in the final Formal Compliance Document (FDO)?

This frontend represents the pipeline discussed in the planning meeting: **Extractor → Coordinator → Engineering/Marketing agents → Composer → FDO**.

## 2. Scope decisions

### In scope

- One regulation: **India's DPDP Act**
- Two departments: **Engineering** and **Marketing**
- Extracted compliance points with source citations
- Department-specific interpretations and recommended actions
- Pipeline status, handoffs, activity history, and agent outputs
- Human review/sign-off states
- FDO preview and export affordance
- Desktop-first responsive web app

### Explicitly out of scope

- Uploading or parsing new laws from the UI
- Editing agent prompts, tools, roles, or guardrails
- Pushback/amendment loops after an FDO is created
- User management, permissions, billing, notifications, and production auth
- Full backend integration; frontend uses mock/seeded data first

## 3. Users and views

| User | Primary need | Default view |
| --- | --- | --- |
| Chief Compliance Officer | See overall risk, progress, blockers, evidence, and sign-offs | Command Center |
| Engineering lead | Understand applicable requirements and required technical changes | Engineering workspace |
| Marketing lead | Understand consent, messaging, cookies, and data-sharing obligations | Marketing workspace |
| Auditor / judge | Trace one requirement from source law to final action | Compliance item detail |

For the MVP, add a **View as** switcher rather than real role-based access.

## 4. Information architecture

Persistent left navigation:

1. **Command Center**
2. **Compliance Items**
3. **Departments**
   - Engineering
   - Marketing
4. **Agent Runs**
5. **FDO Preview**

Top bar:

- Regulation selector, fixed to `DPDP Act`
- Overall run status
- Last updated timestamp
- `Run analysis` / `Replay demo` primary action
- `View as` stakeholder switcher

## 5. Required screens

### Screen 1 — Command Center

**Purpose:** A 10-second executive summary of the entire compliance programme.

**Components**

- Header: `DPDP Compliance Readiness`
- Overall progress ring or bar
- KPI cards:
  - Compliance points extracted
  - High-priority items
  - Departments impacted
  - Awaiting human review
  - Signed off
- Pipeline stepper:
  - Regulation ingested
  - Requirements extracted
  - Departments mapped
  - Department analysis complete
  - FDO composed
  - Sign-off complete
- Risk breakdown: Critical / High / Medium / Low
- Department readiness cards for Engineering and Marketing
- `Needs attention` list showing blockers and pending approvals
- Recent agent activity timeline
- Latest run summary: duration, status, agents involved, estimated cost

**Key interaction:** Clicking any KPI, step, department, or blocker filters/navigates to the relevant items.

### Screen 2 — Compliance Items

**Purpose:** The operating queue for every extracted requirement.

**Layout**

- Search
- Filter chips: priority, department, pipeline status, owner, sign-off state
- Table or dense card list

**Columns**

- ID
- Requirement title
- Source section
- Priority
- Impacted departments
- Current stage
- Owner
- Sign-off status
- Last activity

**Default statuses**

`Extracted` → `Routed` → `Department analysis` → `Ready for review` → `Signed off` → `Included in FDO`

**Useful presets**

- All
- High risk
- Awaiting me
- Blocked
- Ready for FDO

**Key interaction:** Selecting a row opens the Compliance Item Detail screen.

### Screen 3 — Compliance Item Detail

**Purpose:** The core demo screen. Trace one requirement from the source law through every agent and stakeholder.

**Header**

- Requirement title and ID
- Priority badge
- Current status
- Impacted department badges
- Human owner
- `Approve`, `Request changes`, and `Mark implemented` actions

**Main content**

1. **Source requirement**
   - Plain-language summary
   - Verbatim source excerpt
   - Section/page citation link
   - Extractor confidence
2. **Why it matters**
   - Risk if ignored
   - Applicability rationale
3. **Department impact tabs**
   - Engineering interpretation
   - Marketing interpretation
   - Current-state observation
   - Gap identified
   - Recommended changes
   - Evidence requested
   - Department owner and due date
4. **Activity and comments chain**
   - Timestamped events from Extractor, Coordinator, department agents, Composer, and humans
   - Expandable input/output payload for each event
5. **Lifecycle stepper**
   - Extracted → Routed → Analysed → Reviewed → Signed off → Implemented
6. **FDO inclusion preview**
   - Exact section that will be composed into the final document

**Key interaction:** Expand an agent event to reveal what the agent received, decided, produced, and passed to the next agent.

### Screen 4 — Department Workspace

**Purpose:** Give each department a focused action view without the noise of the full programme.

Use one reusable screen with an Engineering/Marketing route parameter.

**Components**

- Department readiness score
- Counts: applicable requirements, high risk, awaiting response, signed off
- Priority action list
- Compliance item cards with:
  - Requirement
  - Department-specific gap
  - Required change
  - Evidence / deliverable
  - Owner and due date
  - Status
- `Awaiting sign-off` panel
- Department activity timeline

**Seeded Engineering examples**

- Reduce unnecessary PII collection and storage
- Define retention/deletion controls
- Restrict and audit access to personal data
- Document breach handling and data flows

**Seeded Marketing examples**

- Capture and evidence valid consent
- Add consent withdrawal paths
- Review cookie and tracking practices
- Review third-party data sharing
- Validate promotional messaging permissions

### Screen 5 — Agent Run Detail / Observability

**Purpose:** Make the multi-agent system legible and score well on buildathon observability.

**Components**

- Run header: run ID, status, start/end time, total latency, total token estimate, total cost estimate
- Trace tree:
  - Extractor
  - Coordinator
  - Engineering agent
  - Marketing agent
  - Composer
- Each node shows status, duration, input count, output count, and handoff target
- Selected-node inspector:
  - Input
  - Reasoning summary
  - Structured output
  - Tool calls / source files
  - Error or escalation state
- Run event timeline
- Filters by agent and status
- `Replay demo` button that animates the same successful seeded run

**Hackathon cut:** Do not build cross-run diffing or alerts unless the core screens are complete. A clear, persistent step-by-step run view is the target.

### Screen 6 — FDO Preview

**Purpose:** Show the final composed artifact before department sign-off.

**Sections**

- Executive summary
- Regulation and scope
- Organisation-wide obligations
- Engineering actions
- Marketing actions
- Responsibility matrix
- Open risks and unresolved items
- Sign-off status by department
- Source citations appendix

**Actions**

- Toggle `Document view` / `Structured view`
- Jump to source compliance item
- `Approve for sign-off`
- `Export PDF` button may be a frontend-only toast in the MVP; label clearly if not implemented

## 6. Shared components

- `AppShell`
- `StakeholderSwitcher`
- `RegulationHeader`
- `PipelineStepper`
- `MetricCard`
- `RiskBadge`
- `StatusBadge`
- `DepartmentBadge`
- `ComplianceItemTable`
- `DepartmentImpactPanel`
- `ActivityTimeline`
- `AgentTraceTree`
- `AgentStepInspector`
- `SourceCitation`
- `ApprovalBar`
- `EmptyState`, `LoadingState`, `ErrorState`

## 7. Visual direction

- **Tone:** trustworthy compliance operations, not a generic AI chat app
- **Layout:** dense but calm; desktop command-center feel
- **Palette:** slate/ink neutrals, off-white surfaces, indigo primary; red/amber/green reserved for risk and status
- **Typography:** clean sans-serif with tabular numerals for metrics
- **Cards:** subtle borders, restrained shadows, 10–12 px radius
- **Agent identity:** use consistent icons/colours per agent, but keep human approvals visually distinct
- **Motion:** animate the pipeline and trace only during `Replay demo`; avoid decorative motion
- **Accessibility:** never communicate status by colour alone

## 8. Frontend data contract

Use TypeScript types and keep seeded data in a single fixture module so a real API can replace it later.

```typescript
type Department = "engineering" | "marketing";
type Risk = "critical" | "high" | "medium" | "low";
type ItemStatus =
  | "extracted"
  | "routed"
  | "analysing"
  | "review"
  | "signed_off"
  | "implemented"
  | "in_fdo";

type ComplianceItem = {
  id: string;
  title: string;
  summary: string;
  source: { section: string; excerpt: string; url?: string };
  risk: Risk;
  departments: Department[];
  status: ItemStatus;
  confidence: number;
  owner?: string;
  dueDate?: string;
  impacts: DepartmentImpact[];
  activity: ActivityEvent[];
};

type DepartmentImpact = {
  department: Department;
  interpretation: string;
  currentState: string;
  gap: string;
  requiredActions: string[];
  evidenceRequired: string[];
  signoff: "pending" | "approved" | "changes_requested";
};

type ActivityEvent = {
  id: string;
  actorType: "agent" | "human";
  actor: string;
  timestamp: string;
  action: string;
  summary: string;
  input?: unknown;
  output?: unknown;
};

type AgentRun = {
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  latencyMs: number;
  costUsd?: number;
  tokens?: number;
  steps: AgentStep[];
};
```

## 9. Seeded demo scenario

Use **8–12 compliance items**, not dozens. Make three especially polished:

1. **Consent for marketing communication** — Marketing only; ready for review
2. **Personal data retention and deletion** — Engineering + Marketing; one department approved, one pending
3. **Personal data breach response** — Engineering-led; high risk, escalated for human review

The remaining items exist to make dashboard counts, filters, and department views feel real.

Seed one completed agent run and one failed/escalated run. Keep every metric internally consistent with the fixture data.

## 10. Judge demo path — 90 seconds

1. Open **Command Center**: show programme health and the live pipeline.
2. Click the high-risk `Personal data retention and deletion` item.
3. Show the source citation, both department interpretations, and different sign-off states.
4. Expand the activity chain to show Extractor → Coordinator → department agents → Composer handoffs.
5. Open **Agent Run Detail** and walk the trace tree.
6. Finish on **FDO Preview**, showing how approved actions become the formal output.

This tells one coherent story: **law in → requirements extracted → departments interpret → humans review → formal compliance document out**.

## 11. Build order

### Must ship

1. App shell and seeded data
2. Command Center
3. Compliance Items list
4. Compliance Item Detail
5. Agent Run Detail
6. FDO Preview
7. Responsive and loading/error polish

### Ship if time remains

- Department workspaces
- Animated replay
- Client-side approval interactions persisted in local storage
- PDF export

### Cut first

- Authentication and permissions
- Agent configuration UI
- Prompt editing
- Real-time collaboration
- Pushback/amendment workflows
- Charts that do not improve the demo narrative

## 12. Acceptance criteria

- A first-time user can identify the highest-risk item within 10 seconds.
- Every compliance item links back to a visible source citation.
- One item can be traced across all five agent roles without leaving the product.
- Engineering and Marketing receive visibly different interpretations and actions.
- Human approval is clearly separated from agent-generated output.
- The run screen shows who called whom, sequence, status, duration, and outputs.
- Dashboard counts match list and detail fixture data.
- The full 90-second demo works from a fresh browser session without narration-dependent clicks.
- No dead controls: hide unfinished features or provide an explicit demo-state response.

---

**Implementation note for Claude Code:** Use a simple route-based React/Next.js frontend, a typed fixture/data-adapter layer, and reusable status/trace components. Do not spend buildathon time on a backend until the complete demo path is polished.
