import type {
  AgentRun,
  ComplianceItem,
  Fdo,
  PracticeRecord,
} from "./types";

// -----------------------------------------------------------------------------
// Practice records (Marketing knowledge base).
// SYNTHETIC demo data only. Nothing resembling real personal data.
// MKT-EMAIL-01 has consent_evidence = null — this is the escalation trigger.
// -----------------------------------------------------------------------------
export const practices: PracticeRecord[] = [
  {
    practice_id: "MKT-EMAIL-01",
    channel: "Email",
    purpose: "Promotional nurture for imported event leads",
    data_collected: ["name", "work_email", "company", "event_tag"],
    collection_source: "CSV import from partner event (Q3 conference)",
    consent_method: "Not recorded at import time",
    consent_evidence: null, // MISSING — escalation trigger
    processors: ["HubSpot", "SendGrid"],
    retention: "Indefinite in CRM",
    opt_out_process: "Unsubscribe link in email footer",
    owner: "Lifecycle Marketing",
    last_verified_at: null,
  },
  {
    practice_id: "MKT-SMS-01",
    channel: "SMS",
    purpose: "Transactional + occasional promotional SMS",
    data_collected: ["phone", "name"],
    collection_source: "Signup form (explicit opt-in checkbox)",
    consent_method: "Affirmative checkbox at signup, per-purpose",
    consent_evidence: "signup_events table, event_type=sms_opt_in",
    processors: ["Twilio"],
    retention: "24 months after last engagement",
    opt_out_process: "Reply STOP; logged and honoured within 24h",
    owner: "Growth Marketing",
    last_verified_at: "2026-05-14T10:12:00Z",
  },
  {
    practice_id: "MKT-WEB-01",
    channel: "Web",
    purpose: "Analytics and advertising cookies",
    data_collected: ["device_id", "ip_truncated", "page_views"],
    collection_source: "Website cookie banner",
    consent_method: "Granular banner with analytics/ads toggles, default off",
    consent_evidence: "cmp_events export, per-visitor consent string",
    processors: ["Google Analytics", "Meta Pixel"],
    retention: "13 months",
    opt_out_process: "Cookie banner preferences link in footer",
    owner: "Web Marketing",
    last_verified_at: "2026-06-02T09:00:00Z",
  },
  {
    practice_id: "MKT-ADS-01",
    channel: "Paid Ads",
    purpose: "Custom audience sharing to ad platforms",
    data_collected: ["hashed_email", "hashed_phone"],
    collection_source: "CRM export",
    consent_method: "Generic marketing consent flag (not scoped to ad sharing)",
    consent_evidence: "crm.marketing_consent flag (not audited for ad-share purpose)",
    processors: ["Meta", "Google Ads", "LinkedIn"],
    retention: "Rolling 180 days on the ad platform side",
    opt_out_process: "CRM opt-out flag propagated via nightly sync",
    owner: "Performance Marketing",
    last_verified_at: "2025-11-20T12:00:00Z", // stale
  },
  {
    practice_id: "MKT-CRM-01",
    channel: "CRM",
    purpose: "Lead storage and scoring",
    data_collected: ["full_contact_profile", "engagement_history"],
    collection_source: "All inbound signup + imported sources",
    consent_method: "Varies by source (not centrally reconciled)",
    consent_evidence: "hubspot.contact_property.original_source (unreconciled)",
    processors: ["HubSpot"],
    retention: "Indefinite",
    opt_out_process: "Manual, on request via privacy@company.example",
    owner: "RevOps",
    last_verified_at: "2025-09-01T08:30:00Z", // stale
  },
];

// -----------------------------------------------------------------------------
// Compliance items — 10 DPDP requirements.
// -----------------------------------------------------------------------------
export const items: ComplianceItem[] = [
  {
    id: "DPDP-001",
    title: "Consent required before promotional communication",
    summary:
      "You may only send promotional messages to a person after obtaining a clear, specific, informed opt-in for that purpose, and you must be able to evidence it.",
    source: {
      section: "Section 6(1)",
      excerpt:
        "The consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action, and shall signify an agreement to the processing of her personal data for the specified purpose.",
    },
    risk: "high",
    departments: ["marketing"],
    status: "review",
    confidence: 0.94,
    owner: "Lifecycle Marketing — Priya Nair",
    dueDate: "2026-07-26",
    riskIfIgnored:
      "Sending marketing to contacts without demonstrable consent exposes the company to penalties under the DPDP Act. Imported event leads are the highest-risk cohort because we cannot evidence a lawful basis.",
    applicabilityRationale:
      "Applies to every outbound channel targeting individuals in India: email, SMS, push, WhatsApp, and audience sharing to ad platforms.",
    impacts: [
      {
        department: "marketing",
        interpretation:
          "Before any promotional dispatch, a consent record must exist that names the purpose, has a timestamp, and points to an evidence artefact. Absence of a record is not consent.",
        currentState:
          "Imported event leads (MKT-EMAIL-01) are activated into nurture sequences immediately after CSV upload. No consent source, timestamp, or evidence artefact is attached.",
        gap: "MKT-EMAIL-01 activates promotional email without any recorded consent evidence.",
        requiredActions: [
          "Block activation of imported contacts until consent_source and consent_timestamp are populated.",
          "Require an evidence artefact (signed form, opt-in screenshot, or event registration record) attached to the contact.",
          "Add a pre-send gate in the marketing automation platform that fails closed if consent evidence is missing.",
        ],
        evidenceRequired: [
          "Exported consent-field audit for the last event-import cohort (n≥10).",
          "Screenshot of the pre-send gate in the automation platform.",
        ],
        citedPracticeIds: ["MKT-EMAIL-01", "MKT-CRM-01"],
        assessmentStatus: "non_compliant",
        confidence: 0.91,
        owner: "Lifecycle Marketing — Priya Nair",
        dueDate: "2026-07-26",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "a1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-12T08:30:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 6(1) into a discrete requirement.",
        confidence: 0.94,
        reasoning:
          "Section 6(1) states a single obligation, so it maps to one requirement. Kept the Act's wording verbatim and wrote the plain summary as a separate field — never blended.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 6(1)" },
        output: {
          requirement_id: "DPDP-001",
          citation: "DPDP Act 2023, Section 6(1)",
          risk: "high",
        },
        handoffTo: "Coordinator Agent",
      },
      {
        id: "a2",
        actorType: "agent",
        actor: "Coordinator Agent",
        agentKind: "coordinator",
        timestamp: "2026-07-12T08:34:00Z",
        action: "Routed to Marketing",
        summary: "Determined this requirement is Marketing-only.",
        confidence: 0.97,
        reasoning:
          "Promotional dispatch is owned entirely by Marketing. No engineering-owned control gates it, so Engineering was excluded rather than copied in by default.",
        input: {
          requirement_id: "DPDP-001",
          candidate_departments: ["engineering", "marketing"],
        },
        output: { routed_to: ["marketing"], excluded: ["engineering"] },
        handoffTo: "Marketing Agent",
      },
      {
        id: "a3",
        actorType: "agent",
        actor: "Marketing Agent",
        agentKind: "marketing",
        timestamp: "2026-07-12T08:42:00Z",
        action: "Produced assessment",
        summary: "Found MKT-EMAIL-01 lacks consent evidence — non_compliant.",
        confidence: 0.91,
        reasoning:
          "MKT-EMAIL-01 has consent_evidence = null. Absence of a record is not consent, so this is non_compliant — not unknown, because the practice record itself is current and affirmatively shows no evidence.",
        input: {
          requirement_id: "DPDP-001",
          practices: ["MKT-EMAIL-01", "MKT-CRM-01"],
        },
        output: {
          assessment_status: "non_compliant",
          cited_practices: ["MKT-EMAIL-01", "MKT-CRM-01"],
          required_actions: 3,
          evidence_required: 1,
        },
        handoffTo: "Composer Agent",
      },
      {
        id: "a4",
        actorType: "agent",
        actor: "Composer Agent",
        agentKind: "composer",
        timestamp: "2026-07-12T08:52:00Z",
        action: "Drafted FDO section",
        summary: "Composed the FDO paragraph for this item.",
        confidence: 0.89,
        reasoning:
          "Wrote the FDO paragraph from the Marketing assessment only. Every claim traces to a cited practice or the verbatim excerpt; nothing was inferred to fill gaps.",
        input: { assessments: 1, departments: ["marketing"] },
        output: {
          fdo_section: "DPDP-001 — Consent required before promotional communication",
          citations: ["DPDP Act 2023, Section 6(1)"],
        },
      },
    ],
    fdoSection:
      "Under Section 6(1) of the DPDP Act, promotional communication requires a free, specific, informed and unambiguous opt-in that the organisation can evidence. Marketing must attach a consent source, timestamp, and evidence artefact to every contact before promotional dispatch. A pre-send gate in the marketing automation platform must fail closed when this evidence is absent. The imported event-leads pipeline (MKT-EMAIL-01) is the primary remediation target.",
  },
  {
    id: "DPDP-002",
    title: "Personal data retention and deletion",
    summary:
      "Personal data must be deleted once the specified purpose is served or consent is withdrawn, unless another law requires it to be kept.",
    source: {
      section: "Section 8(7)",
      excerpt:
        "A Data Fiduciary shall, unless retention is necessary for compliance with any law for the time being in force, erase personal data, upon the Data Principal withdrawing her consent or as soon as it is reasonable to assume that the specified purpose is no longer being served.",
    },
    risk: "high",
    departments: ["engineering", "marketing"],
    status: "analysing",
    confidence: 0.92,
    owner: "Data Platform",
    dueDate: "2026-08-30",
    riskIfIgnored:
      "Indefinite retention multiplies breach blast radius and creates non-compliance the moment a data principal withdraws consent.",
    applicabilityRationale:
      "Applies to every store containing personal data — production databases, warehouse copies, CRM, marketing automation, and backups.",
    impacts: [
      {
        department: "engineering",
        interpretation:
          "Every table containing personal data needs a documented retention policy and an automated deletion job that runs at that cadence, including in the warehouse and long-lived backups.",
        currentState:
          "Core `users` and `events` tables have no TTL. A manual deletion runbook exists but no scheduled job. Warehouse mirrors are not covered.",
        gap: "No automated TTL or scheduled deletion job across production DB, warehouse and backups.",
        requiredActions: [
          "Define per-table retention policy for personal-data tables (owner: data platform).",
          "Ship a scheduled deletion job with dry-run mode and per-run audit log.",
          "Extend deletion to warehouse mirrors and expire backup snapshots after the policy window.",
        ],
        evidenceRequired: [
          "Retention policy document, one entry per personal-data table.",
          "Job run history with row counts for the last 30 days.",
          "Warehouse deletion parity check.",
        ],
        citedPracticeIds: [],
        assessmentStatus: "partial",
        confidence: 0.88,
        owner: "Data Platform — Arjun Rao",
        dueDate: "2026-08-15",
        signoff: "approved",
      },
      {
        department: "marketing",
        interpretation:
          "Marketing must not keep leads indefinitely in the CRM. Retention windows should be tied to engagement recency and stated purpose.",
        currentState:
          "MKT-CRM-01 retains leads indefinitely. There is no automated purge for cold leads and no time-limit tied to purpose.",
        gap: "CRM retention is indefinite; cold leads are never purged.",
        requiredActions: [
          "Set retention to 24 months after last engagement for cold leads.",
          "Automate CRM purge with an approval step for exceptions.",
        ],
        evidenceRequired: [
          "CRM retention policy in the marketing automation platform.",
          "Purge job execution log with row counts.",
        ],
        citedPracticeIds: ["MKT-CRM-01"],
        assessmentStatus: "non_compliant",
        confidence: 0.86,
        owner: "RevOps — Sneha Kulkarni",
        dueDate: "2026-08-30",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "b1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-12T08:31:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 8(7).",
        confidence: 0.92,
        reasoning:
          "Section 8(7) carries a statutory carve-out ('unless retention is necessary for compliance with any law'). Preserved the exception in the excerpt rather than extracting a flat delete-always rule.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 8(7)" },
        output: {
          requirement_id: "DPDP-002",
          citation: "DPDP Act 2023, Section 8(7)",
          risk: "high",
        },
        handoffTo: "Coordinator Agent",
      },
      {
        id: "b2",
        actorType: "agent",
        actor: "Coordinator Agent",
        agentKind: "coordinator",
        timestamp: "2026-07-12T08:33:00Z",
        action: "Routed to Engineering + Marketing",
        summary: "Both departments hold personal data stores.",
        confidence: 0.95,
        reasoning:
          "Retention obligations bind every store holding personal data. Engineering owns the production and warehouse copies; Marketing owns the CRM and automation platform. Routed jointly, in parallel.",
        input: {
          requirement_id: "DPDP-002",
          candidate_departments: ["engineering", "marketing"],
        },
        output: { routed_to: ["engineering", "marketing"], mode: "parallel" },
        handoffTo: "Engineering Agent + Marketing Agent",
      },
      {
        id: "b3",
        actorType: "agent",
        actor: "Engineering Agent",
        agentKind: "engineering",
        timestamp: "2026-07-12T08:45:00Z",
        action: "Produced assessment",
        summary: "Manual runbook exists; no automation. Marked partial.",
        confidence: 0.88,
        reasoning:
          "A documented deletion runbook exists, so this is not a total gap — but it is executed manually and on request only. Partial, not compliant: a control without automation cannot evidence timeliness.",
        input: {
          requirement_id: "DPDP-002",
          sources: ["schema.sql", "runbooks/deletion.md"],
        },
        output: {
          assessment_status: "partial",
          gap: "no automated retention job",
          required_actions: 2,
        },
        handoffTo: "Composer Agent",
      },
      {
        id: "b4",
        actorType: "agent",
        actor: "Marketing Agent",
        agentKind: "marketing",
        timestamp: "2026-07-12T08:46:00Z",
        action: "Produced assessment",
        summary: "Indefinite CRM retention. Marked non_compliant.",
        confidence: 0.86,
        reasoning:
          "MKT-CRM-01 sets no retention period at all — contacts persist indefinitely after the purpose is served. That is an affirmative breach of 8(7), not missing evidence.",
        input: { requirement_id: "DPDP-002", practices: ["MKT-CRM-01"] },
        output: {
          assessment_status: "non_compliant",
          cited_practices: ["MKT-CRM-01"],
          gap: "no retention period configured",
        },
        handoffTo: "Composer Agent",
      },
      {
        id: "b5",
        actorType: "human",
        actor: "Arjun Rao (Engineering Lead)",
        timestamp: "2026-07-12T09:05:00Z",
        action: "Approved engineering plan",
        summary: "Signed off on the automated-deletion plan.",
      },
    ],
    fdoSection:
      "Section 8(7) requires personal data to be erased once its purpose has been served or upon consent withdrawal. Engineering will publish a per-table retention policy and ship a scheduled deletion job with audit logging, extended to warehouse mirrors and backup expiry. Marketing will cap CRM lead retention at 24 months after last engagement and automate the purge with an approvals step for exceptions.",
  },
  {
    id: "DPDP-003",
    title: "Personal data breach response",
    summary:
      "Personal data breaches must be intimated to the Data Protection Board and to every affected Data Principal.",
    source: {
      section: "Section 8(6)",
      excerpt:
        "In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed.",
    },
    risk: "critical",
    departments: ["engineering", "marketing"],
    status: "review",
    confidence: 0.95,
    owner: "Security Engineering — Vikram Shah",
    dueDate: "2026-07-31",
    riskIfIgnored:
      "A missed or delayed breach notification is one of the highest-impact failures under DPDP — regulator escalation is near-automatic.",
    applicabilityRationale:
      "Any incident involving unauthorised access, disclosure, alteration or loss of personal data.",
    impacts: [
      {
        department: "engineering",
        interpretation:
          "The incident-response runbook must include a DPDP-specific notification path — Board plus affected principals — with owners, templates, and timing.",
        currentState:
          "The existing IR runbook covers customer comms and internal escalation but does not reference the DPDP Board or specify affected-principal notification templates.",
        gap: "IR runbook lacks a DPDP-specific notification path.",
        requiredActions: [
          "Add a DPDP notification section to the IR runbook (Board + principals).",
          "Draft principal-facing notification templates by breach class.",
          "Rehearse in the next tabletop exercise.",
        ],
        evidenceRequired: [
          "Updated runbook.",
          "Templates checked into the incident-response repository.",
          "Tabletop exercise record.",
        ],
        citedPracticeIds: [],
        assessmentStatus: "non_compliant",
        confidence: 0.93,
        owner: "Security Engineering — Vikram Shah",
        dueDate: "2026-07-31",
        signoff: "changes_requested",
        escalation: {
          reason: "Regulator-notification path is missing from the runbook — legally significant gap.",
          decisionRequired:
            "CCO to confirm the Board-notification owner and approve principal-facing templates before sign-off.",
          escalatedTo: "Chief Compliance Officer",
        },
      },
    ],
    activity: [
      {
        id: "c1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-12T08:32:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 8(6).",
        confidence: 0.95,
        reasoning:
          "Breach notification is time-bound and prescriptive, so the excerpt was kept whole — truncating it would drop the notification duty owed to both the Board and each affected principal.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 8(6)" },
        output: {
          requirement_id: "DPDP-003",
          citation: "DPDP Act 2023, Section 8(6)",
          risk: "critical",
        },
        handoffTo: "Engineering Agent",
      },
      {
        id: "c2",
        actorType: "agent",
        actor: "Engineering Agent",
        agentKind: "engineering",
        timestamp: "2026-07-12T08:40:00Z",
        action: "Escalated to human review",
        summary: "Runbook gap is above agent threshold — auto-escalated to CCO.",
        confidence: 0.93,
        reasoning:
          "The incident runbook covers internal triage but names no principal-facing notification path. On a critical-risk requirement the agent does not get to decide the company's exposure — escalated to the CCO instead of scoring it.",
        input: {
          requirement_id: "DPDP-003",
          sources: ["runbooks/ir.md"],
          risk: "critical",
        },
        output: {
          assessment_status: "non_compliant",
          escalated_to: "Chief Compliance Officer",
          reason: "critical-risk gap exceeds agent decision threshold",
        },
        handoffTo: "Chief Compliance Officer",
      },
      {
        id: "c3",
        actorType: "human",
        actor: "Meera Iyer (CCO)",
        timestamp: "2026-07-12T09:20:00Z",
        action: "Requested changes",
        summary: "Wants principal-facing templates finalised before approval.",
      },
    ],
    fdoSection:
      "Under Section 8(6), any personal data breach must be intimated to the Data Protection Board and to every affected Data Principal. Engineering will extend the incident-response runbook with a DPDP-specific notification path, principal-facing templates by breach class, and a rehearsal step in the next tabletop.",
  },
  {
    id: "DPDP-004",
    title: "Data minimisation for collected personal data",
    summary: "Collect only what is necessary for the specified purpose.",
    source: {
      section: "Section 5",
      excerpt:
        "A Data Fiduciary shall collect only such personal data as is necessary for the specified purpose.",
    },
    risk: "medium",
    departments: ["engineering", "marketing"],
    status: "analysing",
    confidence: 0.9,
    owner: "Product — Kavya Menon",
    dueDate: "2026-08-10",
    riskIfIgnored: "Excess collection multiplies breach exposure and undermines purpose limitation.",
    applicabilityRationale: "All personal-data intake surfaces (forms, SDKs, imports).",
    impacts: [
      {
        department: "engineering",
        interpretation: "Every intake field must have a documented purpose or be removed.",
        currentState: "Signup form still collects date_of_birth without a stated purpose.",
        gap: "date_of_birth is collected without a documented purpose.",
        requiredActions: ["Drop date_of_birth from signup, or document its purpose."],
        evidenceRequired: ["Field-purpose register spreadsheet."],
        citedPracticeIds: [],
        assessmentStatus: "partial",
        confidence: 0.82,
        owner: "Product — Kavya Menon",
        dueDate: "2026-08-10",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "d1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-11T13:50:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 5.",
        confidence: 0.9,
        reasoning:
          "Section 5 ties collection to a stated purpose. Extracted it as a purpose-limitation duty rather than a data-minimisation rule, which is a related but distinct obligation.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 5" },
        output: {
          requirement_id: "DPDP-004",
          citation: "DPDP Act 2023, Section 5",
          risk: "medium",
        },
        handoffTo: "Coordinator Agent",
      },
    ],
    fdoSection:
      "Section 5 obliges collection to be limited to what is necessary. Product and Engineering will publish a field-purpose register and remove or justify each currently-collected field.",
  },
  {
    id: "DPDP-005",
    title: "Access control and audit logging for personal data",
    summary: "Apply reasonable security safeguards — including access control and auditability.",
    source: {
      section: "Section 8(4)",
      excerpt:
        "A Data Fiduciary shall protect personal data in its possession by taking reasonable security safeguards to prevent personal data breach.",
    },
    risk: "high",
    departments: ["engineering"],
    status: "analysing",
    confidence: 0.88,
    owner: "Security Engineering — Vikram Shah",
    dueDate: "2026-09-01",
    riskIfIgnored: "Without access logs, breach detection and post-incident forensics are impossible.",
    applicabilityRationale: "All systems that hold personal data.",
    impacts: [
      {
        department: "engineering",
        interpretation: "Every read of a personal-data table must be authenticated and logged.",
        currentState: "Warehouse reads are authenticated but not logged per-row.",
        gap: "No per-row access logging in the warehouse.",
        requiredActions: [
          "Enable query-level audit logging on personal-data schemas.",
          "Retain audit logs for 12 months.",
        ],
        evidenceRequired: ["Sample audit-log entries.", "Log retention configuration."],
        citedPracticeIds: [],
        assessmentStatus: "partial",
        confidence: 0.84,
        owner: "Security Engineering — Vikram Shah",
        dueDate: "2026-09-01",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "e1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-11T15:10:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 8(4).",
        confidence: 0.88,
        reasoning:
          "'Reasonable security safeguards' is deliberately open-ended in the Act. Confidence is 0.88 because the citation is unambiguous even though the standard it sets is not.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 8(4)" },
        output: {
          requirement_id: "DPDP-005",
          citation: "DPDP Act 2023, Section 8(4)",
          risk: "high",
        },
        handoffTo: "Coordinator Agent",
      },
    ],
    fdoSection:
      "Section 8(4) requires reasonable security safeguards. Engineering will enable query-level audit logging on personal-data stores with 12-month retention.",
  },
  {
    id: "DPDP-006",
    title: "Cookie and tracking consent",
    summary: "Non-essential tracking cookies need an affirmative, per-purpose opt-in.",
    // The Act itself does not enumerate cookies — we cite the consent clause
    // that governs them. No fabricated citation.
    source: {
      section: "Section 6(1)",
      excerpt:
        "The consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action.",
    },
    risk: "medium",
    departments: ["marketing"],
    status: "signed_off",
    confidence: 0.86,
    owner: "Web Marketing — Rhea Bhatt",
    dueDate: "2026-09-30",
    riskIfIgnored: "Cookie banners without granular opt-in are a common enforcement target.",
    applicabilityRationale: "All web properties.",
    impacts: [
      {
        department: "marketing",
        interpretation: "Granular per-purpose toggles required; no pre-ticked boxes.",
        currentState: "MKT-WEB-01 uses a granular banner with analytics and ads toggles, both default off.",
        gap: "None currently observed.",
        requiredActions: ["Quarterly audit of the consent banner and categories."],
        evidenceRequired: ["Banner screenshot.", "Consent management platform export."],
        citedPracticeIds: ["MKT-WEB-01"],
        assessmentStatus: "compliant",
        confidence: 0.9,
        owner: "Web Marketing — Rhea Bhatt",
        dueDate: "2026-09-30",
        signoff: "approved",
      },
    ],
    activity: [
      {
        id: "f1",
        actorType: "agent",
        actor: "Marketing Agent",
        agentKind: "marketing",
        timestamp: "2026-07-10T10:50:00Z",
        action: "Produced assessment",
        summary: "Banner meets the requirement — compliant.",
        confidence: 0.9,
        reasoning:
          "MKT-WEB-01 has both toggles defaulting to off and a current consent-platform export on file. Control present AND evidence present, so compliant is earned rather than assumed.",
        input: { requirement_id: "DPDP-006", practices: ["MKT-WEB-01"] },
        output: {
          assessment_status: "compliant",
          cited_practices: ["MKT-WEB-01"],
          required_actions: 1,
        },
        handoffTo: "Composer Agent",
      },
      {
        id: "f2",
        actorType: "human",
        actor: "Rhea Bhatt (Marketing Lead)",
        timestamp: "2026-07-10T11:00:00Z",
        action: "Approved",
        summary: "Signed off.",
      },
    ],
    fdoSection:
      "Cookie consent on web properties meets the granular affirmative-action bar; a quarterly audit is scheduled.",
  },
  {
    id: "DPDP-007",
    title: "Consent withdrawal must be as easy as giving consent",
    summary: "Withdrawing consent must be at least as easy as giving it.",
    source: {
      section: "Section 6(4)",
      excerpt:
        "The Data Principal shall have the right to withdraw her consent at any time, with the ease of doing so being comparable to the ease with which such consent was given.",
    },
    risk: "high",
    departments: ["engineering", "marketing"],
    status: "routed",
    confidence: 0.91,
    owner: "Product — Kavya Menon",
    dueDate: "2026-08-20",
    riskIfIgnored: "Friction on withdrawal is a specific enforcement target.",
    applicabilityRationale: "Every consent-gated experience.",
    impacts: [
      {
        department: "engineering",
        interpretation: "A single-click withdrawal endpoint per consent purpose is required.",
        currentState: "Withdrawal currently requires emailing support.",
        gap: "No self-serve withdrawal endpoint.",
        requiredActions: ["Ship /consent/withdraw with per-purpose toggles."],
        evidenceRequired: ["Endpoint URL.", "UX flow screenshots."],
        citedPracticeIds: [],
        assessmentStatus: "non_compliant",
        confidence: 0.87,
        owner: "Product — Kavya Menon",
        dueDate: "2026-08-20",
        signoff: "pending",
      },
      {
        department: "marketing",
        interpretation: "Unsubscribe UX must be one-click and propagate to every channel.",
        currentState: "Email unsubscribe works; SMS opt-out works; ad-audience removal is manual.",
        gap: "Ad-audience removal is manual.",
        requiredActions: ["Automate audience removal on the withdrawal signal."],
        evidenceRequired: ["Automation configuration in the ad platform."],
        citedPracticeIds: ["MKT-ADS-01"],
        assessmentStatus: "partial",
        confidence: 0.83,
        owner: "Performance Marketing — Dev Kapoor",
        dueDate: "2026-08-20",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "g1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-11T08:50:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 6(4).",
        confidence: 0.91,
        reasoning:
          "The operative test is comparability — withdrawal must be as easy as granting. Extracted it as a parity requirement, since a withdrawal path that merely exists can still fail this section.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 6(4)" },
        output: {
          requirement_id: "DPDP-007",
          citation: "DPDP Act 2023, Section 6(4)",
          risk: "high",
        },
        handoffTo: "Coordinator Agent",
      },
    ],
    fdoSection:
      "Section 6(4) requires withdrawal parity with granting consent. Engineering will publish a per-purpose self-serve withdrawal endpoint; Marketing will automate audience removal on the withdrawal signal.",
  },
  {
    id: "DPDP-008",
    title: "Third-party processors and audience sharing",
    summary: "Processors require a valid contract; sharing personal data with them requires a lawful basis.",
    source: {
      section: "Section 8(2)",
      excerpt:
        "A Data Fiduciary may engage, appoint, use or otherwise involve a Data Processor to process personal data on its behalf … only under a valid contract.",
    },
    risk: "high",
    departments: ["marketing"],
    status: "analysing",
    confidence: 0.89,
    owner: "Performance Marketing — Dev Kapoor",
    dueDate: "2026-08-15",
    riskIfIgnored: "Audience sharing without a specific-purpose consent basis is high-risk.",
    applicabilityRationale: "Every processor receiving personal data.",
    impacts: [
      {
        department: "marketing",
        interpretation:
          "Custom-audience sharing must be covered by consent whose specified purpose includes ad-platform sharing, plus a valid DPA.",
        currentState:
          "MKT-ADS-01 uses a generic marketing-consent flag without a specific ad-sharing purpose; the practice record's last verification is stale.",
        gap: "Ad-audience sharing lacks a specific purpose-scoped consent basis.",
        requiredActions: [
          "Introduce a specific ad-sharing consent purpose.",
          "Refresh MKT-ADS-01 last_verified_at with a purpose-linked audit.",
          "Confirm DPAs on file for Meta, Google Ads, LinkedIn.",
        ],
        evidenceRequired: [
          "Consent purpose taxonomy update.",
          "Signed DPAs on file.",
          "Refreshed practice record.",
        ],
        citedPracticeIds: ["MKT-ADS-01"],
        assessmentStatus: "unknown",
        confidence: 0.79,
        owner: "Performance Marketing — Dev Kapoor",
        dueDate: "2026-08-15",
        signoff: "pending",
        escalation: {
          reason:
            "MKT-ADS-01 consent evidence is stale (last verified 2025-11-20) — agent cannot conclude compliance without a fresh audit.",
          decisionRequired:
            "CCO to accept the interim non-compliance risk OR direct Marketing to complete a fresh audit before the next run.",
          escalatedTo: "Chief Compliance Officer",
        },
      },
    ],
    activity: [
      {
        id: "h1",
        actorType: "agent",
        actor: "Marketing Agent",
        agentKind: "marketing",
        timestamp: "2026-07-11T10:20:00Z",
        action: "Returned unknown",
        summary: "Consent evidence is stale — refused to guess, escalated for human verification.",
        confidence: 0.79,
        reasoning:
          "MKT-ADS-01 carries a generic marketing-consent flag and was last verified 2025-11-20. A stale record is not evidence of compliance, and it is not evidence of breach either — so the honest status is unknown. Defaulting to compliant would manufacture assurance the data does not support; defaulting to non_compliant would accuse Marketing on the strength of a missing audit. Escalated to the CCO with the decision stated.",
        input: {
          requirement_id: "DPDP-008",
          practices: ["MKT-ADS-01"],
          consent_evidence: "generic marketing flag",
          last_verified_at: "2025-11-20",
        },
        output: {
          assessment_status: "unknown",
          escalated_to: "Chief Compliance Officer",
          decision_required:
            "Accept interim risk OR order a fresh purpose-linked consent audit",
          blocked_on: "refreshed MKT-ADS-01 evidence",
        },
        handoffTo: "Chief Compliance Officer",
      },
    ],
    fdoSection:
      "Section 8(2) requires processor engagements to rest on a valid contract and lawful basis. Marketing will introduce a purpose-scoped ad-sharing consent, refresh the MKT-ADS-01 practice record on a verified basis, and confirm DPAs are on file with each ad platform.",
  },
  {
    id: "DPDP-009",
    title: "Grievance redressal mechanism",
    summary: "Publish a working contact for data-protection queries and grievances.",
    source: {
      section: "Section 8(10)",
      excerpt:
        "A Data Fiduciary shall publish the contact information of a Data Protection Officer or a person who is able to answer, on behalf of the Data Fiduciary, questions about the processing of personal data.",
    },
    risk: "medium",
    departments: ["engineering", "marketing"],
    status: "signed_off",
    confidence: 0.93,
    owner: "Legal — Kabir Sethi",
    dueDate: "2026-09-30",
    riskIfIgnored: "Baseline transparency requirement — easy to satisfy, embarrassing to miss.",
    applicabilityRationale: "Public website and product footer.",
    impacts: [
      {
        department: "engineering",
        interpretation: "A /privacy/contact page is required, linked from the footer.",
        currentState: "Page exists; footer link exists.",
        gap: "None.",
        requiredActions: ["Add a response-time SLA to the page."],
        evidenceRequired: ["Page URL."],
        citedPracticeIds: [],
        assessmentStatus: "compliant",
        confidence: 0.92,
        owner: "Product — Kavya Menon",
        dueDate: "2026-09-30",
        signoff: "approved",
      },
    ],
    activity: [
      {
        id: "i1",
        actorType: "human",
        actor: "Meera Iyer (CCO)",
        timestamp: "2026-07-09T15:50:00Z",
        action: "Approved",
        summary: "Signed off.",
      },
    ],
    fdoSection:
      "A published DPO contact and grievance page satisfies Section 8(10); a response-time SLA will be added to the page.",
  },
  {
    id: "DPDP-010",
    title: "Processing personal data of children",
    summary:
      "Personal data of children requires verifiable parental consent and cannot fuel targeted advertising.",
    source: {
      section: "Section 9",
      excerpt:
        "A Data Fiduciary shall, before processing any personal data of a child, obtain verifiable consent of the parent of such child or the lawful guardian.",
    },
    risk: "low",
    departments: ["engineering", "marketing"],
    status: "extracted",
    confidence: 0.87,
    owner: "Legal — Kabir Sethi",
    dueDate: "2026-10-01",
    riskIfIgnored:
      "The product is not targeted at children today, but incidental sign-ups still require a policy.",
    applicabilityRationale: "Any signup path a minor could complete.",
    impacts: [
      {
        department: "engineering",
        interpretation: "An age gate plus parental-verification path is required if minors can sign up.",
        currentState: "No age gate in place.",
        gap: "No age gate.",
        requiredActions: [
          "Add an age gate on signup; block sub-18 accounts pending parental verification.",
        ],
        evidenceRequired: ["Signup screenshot.", "Blocked-account counter."],
        citedPracticeIds: [],
        assessmentStatus: "unknown",
        confidence: 0.7,
        owner: "Product — Kavya Menon",
        dueDate: "2026-10-01",
        signoff: "pending",
      },
    ],
    activity: [
      {
        id: "j1",
        actorType: "agent",
        actor: "Extractor Agent",
        agentKind: "extractor",
        timestamp: "2026-07-11T11:50:00Z",
        action: "Extracted requirement",
        summary: "Parsed Section 9.",
        confidence: 0.87,
        reasoning:
          "Section 9 applies on the basis of who signs up, not who the product targets. Extracted it as in-scope despite the product not being aimed at children — applicability is a legal test, not a marketing one.",
        input: { document: "DPDP Act 2023.pdf", section: "Section 9" },
        output: {
          requirement_id: "DPDP-010",
          citation: "DPDP Act 2023, Section 9",
          risk: "low",
        },
        handoffTo: "Coordinator Agent",
      },
    ],
    fdoSection:
      "Section 9 requires verifiable parental consent for children's data. An age gate will be added to signup and the ads pipeline will exclude minor accounts.",
  },
];

// -----------------------------------------------------------------------------
// Agent runs — totals equal the sum of their steps.
// Run RUN-A: successful full pipeline.
// Run RUN-B: escalated on missing evidence in MKT-EMAIL-01.
// -----------------------------------------------------------------------------
const runASteps = [
  {
    id: "s1",
    agent: "extractor" as const,
    status: "completed" as const,
    startedAt: "2026-07-12T08:30:00Z",
    durationMs: 300_000,
    inputCount: 1,
    outputCount: 10,
    tokens: 42_100,
    costUsd: 0.88,
    handoffTo: "coordinator",
    reasoning:
      "Scanned the DPDP Act section by section, isolating each discrete obligation. Kept the Act's own language and added a plain summary separately. Confidence reflects citation clarity, not agreement.",
    input: { document: "DPDP Act 2023.pdf", pages: 42 },
    output: { requirements: 10 },
    toolCalls: ["pdf.extract_section", "citations.resolve"],
    sourceFiles: ["DPDP Act 2023.pdf"],
  },
  {
    id: "s2",
    agent: "coordinator" as const,
    status: "completed" as const,
    startedAt: "2026-07-12T08:35:00Z",
    durationMs: 120_000,
    inputCount: 10,
    outputCount: 10,
    tokens: 12_400,
    costUsd: 0.26,
    handoffTo: "engineering + marketing",
    reasoning:
      "Mapped each requirement to the departments that own the corresponding controls. Marketing-only, Engineering-only, and joint routes were assigned explicitly. Nothing was silently dropped.",
    input: { requirements: 10 },
    output: { routes: { engineering: 6, marketing: 5, joint: 4 } },
    toolCalls: ["dept.route"],
    sourceFiles: [],
  },
  {
    id: "s3",
    agent: "engineering" as const,
    status: "completed" as const,
    startedAt: "2026-07-12T08:37:00Z",
    durationMs: 600_000,
    inputCount: 6,
    outputCount: 6,
    tokens: 68_200,
    costUsd: 1.42,
    handoffTo: "composer",
    reasoning:
      "For each engineering-scoped requirement I checked whether a matching control exists AND whether evidence is on file. Nothing was marked compliant without both.",
    input: { requirements: 6 },
    output: { compliant: 1, partial: 3, non_compliant: 1, unknown: 1 },
    toolCalls: ["schema.introspect", "jobs.list", "runbooks.search"],
    sourceFiles: ["schema.sql", "runbooks/ir.md"],
  },
  {
    id: "s4",
    agent: "marketing" as const,
    status: "completed" as const,
    startedAt: "2026-07-12T08:37:00Z",
    durationMs: 540_000,
    inputCount: 5,
    outputCount: 5,
    tokens: 51_800,
    costUsd: 1.08,
    handoffTo: "composer",
    reasoning:
      "Scored each marketing-scoped requirement against the practice knowledge base. Practices with stale or missing evidence produced status=unknown, never a compliant default.",
    input: { requirements: 5, practices: 5 },
    output: { compliant: 1, partial: 1, non_compliant: 2, unknown: 1 },
    toolCalls: ["practices.list", "practices.evidence_check"],
    sourceFiles: ["practices.yaml"],
  },
  {
    id: "s5",
    agent: "composer" as const,
    status: "completed" as const,
    startedAt: "2026-07-12T08:47:00Z",
    durationMs: 300_000,
    inputCount: 11,
    outputCount: 1,
    tokens: 29_600,
    costUsd: 0.62,
    reasoning:
      "One FDO section per requirement. Kept legal text, observed practice, and recommendation as three separate labelled paragraphs. Preserved verbatim citations.",
    input: { assessments: 11 },
    output: { document: "FDO-DPDP-2026-07-12.md", sections: 10 },
    toolCalls: ["fdo.compose_section"],
    sourceFiles: [],
  },
];

const runATotals = runASteps.reduce(
  (acc, s) => ({
    latencyMs: acc.latencyMs + s.durationMs,
    tokens: acc.tokens + s.tokens,
    costUsd: acc.costUsd + s.costUsd,
  }),
  { latencyMs: 0, tokens: 0, costUsd: 0 },
);

const runBSteps = [
  {
    id: "t1",
    agent: "extractor" as const,
    status: "completed" as const,
    startedAt: "2026-07-11T18:00:00Z",
    durationMs: 120_000,
    inputCount: 1,
    outputCount: 1,
    tokens: 8_400,
    costUsd: 0.18,
    handoffTo: "coordinator",
    reasoning: "Targeted re-extraction of the promotional-consent obligation only.",
    input: { requirement_id: "DPDP-001" },
    output: { requirement_id: "DPDP-001" },
    toolCalls: ["pdf.extract_section"],
    sourceFiles: ["DPDP Act 2023.pdf"],
  },
  {
    id: "t2",
    agent: "coordinator" as const,
    status: "completed" as const,
    startedAt: "2026-07-11T18:02:00Z",
    durationMs: 60_000,
    inputCount: 1,
    outputCount: 1,
    tokens: 2_100,
    costUsd: 0.04,
    handoffTo: "marketing",
    reasoning: "Routed to Marketing only.",
    input: { requirement_id: "DPDP-001" },
    output: { departments: ["marketing"] },
    toolCalls: ["dept.route"],
    sourceFiles: [],
  },
  {
    id: "t3",
    agent: "marketing" as const,
    status: "escalated" as const,
    startedAt: "2026-07-11T18:03:00Z",
    durationMs: 480_000,
    inputCount: 1,
    outputCount: 0,
    tokens: 18_900,
    costUsd: 0.39,
    reasoning:
      "MKT-EMAIL-01 has consent_evidence=null and no last_verified_at. Per the decision rule 'missing or stale evidence yields unknown, never a guess', I did not mark this compliant or non-compliant on my own — I returned unknown and escalated so a human can either produce the evidence or accept the non-compliance.",
    input: { requirement_id: "DPDP-001", practices: ["MKT-EMAIL-01"] },
    output: {
      status: "unknown",
      reason: "MKT-EMAIL-01 has no recorded consent artefact.",
      escalate_to: "Chief Compliance Officer",
    },
    toolCalls: ["practices.evidence_check"],
    sourceFiles: ["practices.yaml"],
    escalation: {
      reason: "MKT-EMAIL-01 has no consent evidence and has never been verified.",
      decisionRequired:
        "CCO to either produce a consent artefact for imported event leads OR accept the non-compliance and pause activation.",
      escalatedTo: "Chief Compliance Officer",
    },
  },
];

const runBTotals = runBSteps.reduce(
  (acc, s) => ({
    latencyMs: acc.latencyMs + s.durationMs,
    tokens: acc.tokens + s.tokens,
    costUsd: acc.costUsd + s.costUsd,
  }),
  { latencyMs: 0, tokens: 0, costUsd: 0 },
);

export const runs: AgentRun[] = [
  {
    id: "RUN-2026-07-12-A",
    status: "completed",
    startedAt: "2026-07-12T08:30:00Z",
    completedAt: "2026-07-12T08:52:00Z",
    latencyMs: runATotals.latencyMs,
    tokens: runATotals.tokens,
    costUsd: Math.round(runATotals.costUsd * 100) / 100,
    steps: runASteps,
    events: [
      { timestamp: "2026-07-12T08:30:00Z", agent: "extractor", level: "info", message: "Reading DPDP Act 2023.pdf" },
      { timestamp: "2026-07-12T08:35:00Z", agent: "extractor", level: "info", message: "10 requirements extracted" },
      { timestamp: "2026-07-12T08:37:00Z", agent: "coordinator", level: "info", message: "Routing complete" },
      { timestamp: "2026-07-12T08:40:00Z", agent: "engineering", level: "escalation", message: "DPDP-003 escalated to CCO" },
      { timestamp: "2026-07-12T08:46:00Z", agent: "marketing", level: "warn", message: "DPDP-008 returned unknown" },
      { timestamp: "2026-07-12T08:52:00Z", agent: "composer", level: "info", message: "FDO drafted" },
    ],
    summary:
      "Full DPDP pass. 10 requirements extracted, routed to Engineering and Marketing, both departments analysed in parallel, composer drafted the FDO. One assessment (DPDP-008) returned status=unknown; one (DPDP-003) auto-escalated to the CCO.",
  },
  {
    id: "RUN-2026-07-11-B",
    status: "escalated",
    startedAt: "2026-07-11T18:00:00Z",
    completedAt: "2026-07-11T18:11:00Z",
    latencyMs: runBTotals.latencyMs,
    tokens: runBTotals.tokens,
    costUsd: Math.round(runBTotals.costUsd * 100) / 100,
    steps: runBSteps,
    events: [
      { timestamp: "2026-07-11T18:00:00Z", agent: "extractor", level: "info", message: "Re-run of DPDP-001" },
      { timestamp: "2026-07-11T18:03:00Z", agent: "marketing", level: "info", message: "Evaluating MKT-EMAIL-01" },
      {
        timestamp: "2026-07-11T18:11:00Z",
        agent: "marketing",
        level: "escalation",
        message: "No consent evidence for MKT-EMAIL-01 — escalated to CCO",
      },
    ],
    summary:
      "Targeted re-run for DPDP-001. Marketing Agent could not evidence consent for MKT-EMAIL-01, returned status=unknown, and ESCALATED to the CCO rather than guessing.",
  },
];

// -----------------------------------------------------------------------------
// FDO fixture (used by the FDO placeholder route later).
// -----------------------------------------------------------------------------
export const fdo: Fdo = {
  regulation: "Digital Personal Data Protection Act, 2023 (India)",
  scope:
    "Processing of digital personal data of individuals in India by the organisation and its processors, across product, engineering, and marketing surfaces.",
  updatedAt: "2026-07-12T09:30:00Z",
  sections: [
    {
      id: "exec",
      title: "Executive summary",
      body:
        "This document consolidates the organisation's obligations under the DPDP Act as of the latest agent run. Two items are signed off; the rest are in remediation, with one escalated to the CCO pending human decision. The highest-risk open item is breach notification (DPDP-003).",
    },
  ],
  signoffByDepartment: [
    { department: "engineering", state: "pending", owner: "Arjun Rao" },
    { department: "marketing", state: "pending", owner: "Rhea Bhatt" },
  ],
};
