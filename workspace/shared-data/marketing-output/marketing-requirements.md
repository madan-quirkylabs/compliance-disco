# Marketing Compliance Requirements — DPDP Act 2023

The DPDP Act 2023 introduces purpose- and consent-first obligations that fundamentally reshape how marketing collects, processes, and retains personal data across all channels. Marketing teams must transition from implied-consent / soft-opt-in practices to explicit, itemised, per-purpose consent with auditable records and transparent withdrawal mechanisms. Every customer-facing touchpoint — from signup forms and email campaigns to retargeting pixels and imported lead lists — must be audited and adapted to satisfy five core obligations (D-05, D-06, D-08, D-09, D-11). Below are the specific requirements, mapped to their originating obligation and prioritised by risk and implementation effort.

## Requirements

### MREQ-1: Implement itemised per-purpose consent on all web signup forms
- **Obligation:** D-05
- **Requirement:** All web signup, registration, and lead-capture forms must present individual checkboxes (not a blanket "I agree") for each distinct marketing purpose — e.g., promotional email, SMS offers, WhatsApp outreach, personalisation, analytics, third-party sharing. Each purpose must be accompanied by a plain-language description of what data is processed and why. Pre-ticked checkboxes are prohibited.
- **Acceptance Criteria:**
  - Each marketing purpose appears as a separate, un-ticked checkbox.
  - Each checkbox has an adjacent plain-language purpose description.
  - Consent records (purpose, timestamp, IP, user identifier) are logged to the consent DB.
  - No blanket "Select All" on marketing purposes.
- **Priority:** P0
- **Affected channels/practices:** Web signup/consent forms

---

### MREQ-2: Enable one-click consent withdrawal accessible from every marketing message
- **Obligation:** D-05
- **Requirement:** Withdrawal of consent must be as easy as giving it. Every promotional email, SMS, and WhatsApp message must include a single-click/tap unsubscribe or withdrawal mechanism. Withdrawal must apply at the purpose level — e.g., the user can withdraw consent for SMS without affecting email consent, unless the user explicitly chooses to withdraw all. The withdrawal action must be recorded in the consent DB with the same granularity as the original consent.
- **Acceptance Criteria:**
  - Every promotional email includes a visible, working unsubscribe link that triggers a purpose-level withdrawal screen.
  - Every SMS and WhatsApp promotion includes a short-code stop keyword or reply-to-stop that triggers withdrawal.
  - Withdrawal is recorded with purpose, timestamp, and channel in the consent log.
  - Withdrawal takes effect within 72 hours.
- **Priority:** P0
- **Affected channels/practices:** Promotional email, SMS, WhatsApp outreach

---

### MREQ-3: Purge personal data from marketing systems on consent withdrawal or purpose completion
- **Obligation:** D-06
- **Requirement:** When a Data Principal withdraws consent for a purpose, or the purpose for which data was collected is complete, marketing systems must erase the corresponding personal data within a defined window (72 hours for automated systems, 7 days for backups). This includes CRM records, email platform subscriber lists, WhatsApp contact lists, SMS broadcast lists, analytics profiles, and retargeting audiences. Data may be retained only if a separate legal obligation (e.g., tax record retention) applies, and such retention must be documented.
- **Acceptance Criteria:**
  - Automated deletion of the user from marketing-platform subscriber/contact lists on withdrawal.
  - Removal from retargeting audiences (Facebook Custom Audiences, Google Ads lists) within 72 hours.
  - Deletion from CRM and lead databases within 72 hours.
  - Any data retained under separate legal obligation is tagged with the retention justification and a deletion date.
- **Priority:** P0
- **Affected channels/practices:** Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting, analytics/tracking pixels

---

### MREQ-4: Mask and encrypt personal data in marketing systems and exports
- **Obligation:** D-08
- **Requirement:** Personal data stored in marketing platforms (email lists, CRM, analytics databases) and transmitted in marketing exports (CSV uploads, API payloads, pixel events) must be protected by encryption at rest and in transit. Fields used for personalisation (name, email, phone, location) may be reversibly encrypted; fields not required for active campaigns under valid consent must be masked or tokenised. Marketing teams must maintain an inventory of where each personal data field is stored and what protection is applied.
- **Acceptance Criteria:**
  - All marketing-platform APIs use TLS 1.2+ for data in transit.
  - Personally identifiable data in marketing databases is encrypted at rest (AES-256 or equivalent).
  - CSV exports for ad-platform uploads use masked/hashed identifiers where possible (e.g., SHA-256 hashed email for Custom Audiences).
  - An inventory of personal data locations and encryption status is maintained and reviewed quarterly.
- **Priority:** P1
- **Affected channels/practices:** Promotional email, ad targeting & retargeting, analytics/tracking pixels, purchased/imported lead lists

---

### MREQ-5: Detect and report breaches involving marketing data
- **Obligation:** D-09
- **Requirement:** Marketing systems that handle personal data (email platforms, CRM, analytics, ad platforms) must be covered by the organisation's breach detection and notification pipeline. Marketing must designate a point of contact to receive breach alerts and must maintain documented escalation procedures to the Data Protection Officer within 24 hours of confirmed or suspected breach involving marketing data. Breaches include unauthorised access to subscriber lists, export of customer data by a compromised marketing tool, or exposure of personalisation profiles through an analytics pixel.
- **Acceptance Criteria:**
  - Marketing channels have documented escalation paths to the DPO.
  - A designated marketing security contact is appointed and trained.
  - Breach notification template (Data Principal facing) is drafted and approved for marketing use cases.
  - Tabletop exercise is conducted quarterly covering a simulated marketing data breach.
- **Priority:** P1
- **Affected channels/practices:** Promotional email, SMS, WhatsApp outreach, analytics/tracking pixels, purchased/imported lead lists

---

### MREQ-6: Retain marketing logs and consent records for at least one year
- **Obligation:** D-11
- **Requirement:** Consent records, withdrawal records, marketing campaign logs, and personal data processing logs must be retained for a minimum of one year from the date of creation, or longer if a legal or regulatory requirement mandates it. Logs must be immutable (append-only) and time-stamped. After the retention period, logs that do not serve a separate legal purpose must be erased or anonymised.
- **Acceptance Criteria:**
  - Consent DB records are retained for at least 366 days post-withdrawal or post-purpose-completion.
  - Campaign send logs (email/SMS/WhatsApp dispatch records) are retained for at least one year.
  - Logs are stored in an append-only format (e.g., database with insert-only permissions).
  - Automated deletion or archival is triggered after the retention period expires.
  - Retention policy is documented and auditable.
- **Priority:** P1
- **Affected channels/practices:** Promotional email, SMS, WhatsApp outreach, web signup/consent forms

---

### MREQ-7: Discontinue use of purchased or imported lead lists without documented valid consent
- **Obligation:** D-05, D-06
- **Requirement:** Marketing must not use purchased, rented, or imported lead lists for any outbound communication (email, SMS, WhatsApp, phone) unless each lead on the list has provided documented, itemised consent that meets DPDP Act standards specifically for the intended communication channel. Lists for which valid consent cannot be demonstrated must be erased or segregated into a "no-consent" quarantine database that is never used for outreach. New lead imports must pass a consent-validity gate before entering any active campaign list.
- **Acceptance Criteria:**
  - Inventory of all purchased/imported lead lists is created with source, date, and consent status.
  - Lists without verifiable per-purpose consent are quarantined and blocked from campaign systems.
  - A consent-validity gate is implemented in the lead import pipeline.
  - Quarantined data is erased within 7 days unless covered by a documented legal retention exemption.
- **Priority:** P0
- **Affected channels/practices:** Purchased/imported lead lists

---

### MREQ-8: Apply security safeguards to analytics and tracking pixel data
- **Obligation:** D-08
- **Requirement:** Analytics scripts and tracking pixels that collect personal data (email, phone, hashed identifiers, device IDs) must transmit data via encrypted channels. PII transmitted to third-party analytics/ad platforms must be minimised to only what is necessary under the specific consent obtained. Where possible, use server-side tracking or first-party cookie alternatives instead of third-party pixels that expose personal data to uncontrolled downstream processing.
- **Acceptance Criteria:**
  - All analytics and pixel calls use HTTPS (TLS 1.2+).
  - Data minimisation review is completed: only fields with documented consent are passed to each analytics/ad platform.
  - A migration plan for server-side / first-party tracking is drafted and approved.
- **Priority:** P2
- **Affected channels/practices:** Analytics/tracking pixels, ad targeting & retargeting

---

### MREQ-9: Obtain explicit consent before using personal data for ad retargeting
- **Obligation:** D-05
- **Requirement:** Ad retargeting (displaying ads to users based on their prior interactions with the website/app) constitutes a distinct processing purpose requiring separate, itemised consent. Users must be able to decline retargeting while retaining consent for other marketing purposes (e.g., transactional emails). The consent mechanism for retargeting must be presented at the same time as other marketing consents, not buried in a third-party cookie banner separate from the main consent flow. Retargeting lists (Custom Audiences, remarketing tags) must exclude users who have not given explicit retargeting consent.
- **Acceptance Criteria:**
  - A separate consent checkbox for "personalised ads / retargeting" exists on the signup form.
  - Retargeting pixels fire only when retargeting consent is present.
  - Retargeting lists are purged of users whose retargeting consent has been withdrawn.
  - Sync with ad platforms (Facebook, Google, LinkedIn) only includes consent-positive users.
- **Priority:** P0
- **Affected channels/practices:** Ad targeting & retargeting, web signup/consent forms

---

### MREQ-10: Maintain consent records synchronised across all marketing platforms
- **Obligation:** D-05, D-06, D-11
- **Requirement:** Consent state must be authoritative in a central consent-management platform (CMP) and synchronised to all downstream marketing platforms (email service provider, SMS gateway, WhatsApp Business API, CRM, ad platforms, analytics). No marketing platform may act on stale or absent consent data. Synchronisation must include: consent grant, consent withdrawal, purpose change, and data erasure requests. Sync latency must not exceed 4 hours.
- **Acceptance Criteria:**
  - A single source-of-truth CMP is deployed and integrated.
  - All marketing platforms receive consent state updates within 4 hours.
  - A reconciliation audit between CMP and each marketing platform is run weekly.
  - Scheduled sends and ad campaigns respect consent updates within the 4-hour window.
- **Priority:** P1
- **Affected channels/practices:** Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting
