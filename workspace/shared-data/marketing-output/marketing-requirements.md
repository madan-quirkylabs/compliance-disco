# Marketing Compliance Requirements — DPDP Act 2023

## Summary

The DPDP Act 2023 fundamentally rewrites how marketing can collect, store, and use personal data in India. Every marketing channel — promotional email, SMS, WhatsApp outreach, web signup forms, ad targeting/retargeting, analytics/tracking pixels, and purchased lead lists — must shift from implicit/soft-opt-in to a documented, affirmative-consent model with clear notice, easy withdrawal, and strict data hygiene. Existing lead databases must be re-notified. Child targeting and behavioural tracking of minors are outright banned. Marketing automation (CRMs, ESPs, ad platforms) must integrate consent lifecycle management and honour erasure requests within defined SLAs. The following requirements translate the legislative obligations into actionable engineering and process changes for the marketing team.

---

## Requirements

### MREQ-1: Consent-Based Marketing Email — Opt-In Notice on All Promotional Emails
- **Obligation:** OBL-002 (Notice to Data Principal)
- **Requirement:** Every promotional email sent to a data principal must include or be preceded by a notice identifying what personal data is used, the specific purpose of the communication, how the recipient can exercise rights (access, correction, erasure), and how to complain to the DPDP Board. The notice must be independently understandable and in clear, plain language.
- **Acceptance Criteria:**
  - All email templates audited and updated with a privacy notice footer.
  - Notice includes: itemised data used (email, name, browsing behaviour if applicable), purpose (e.g., promotional offers), link to rights/exercise page, DPO contact, link to DPDP Board complaint portal.
  - A/B test confirms notice does not reduce deliverability (spam score < threshold).
- **Priority:** P0
- **Affected Channel(s):** Promotional email

### MREQ-2: Rights Management & Easy Withdrawal in Email/SMS/WhatsApp
- **Obligation:** OBL-007 (Right to Withdraw Consent)
- **Requirement:** Every marketing communication across email, SMS, and WhatsApp must include a mechanism to withdraw consent (unsubscribe) with ease comparable to giving consent — i.e., one-click or one-reply, not requiring login or multiple steps.
- **Acceptance Criteria:**
  - Email: one-click unsubscribe link (List-Unsubscribe header + landing page).
  - SMS: reply STOP/UNSUBSCRIBE keyword honoured with no additional steps.
  - WhatsApp: opt-out via quick-reply button or "STOP" message.
  - Withdrawal takes effect within 24 hours and is logged with timestamp for audit.
  - No promotional messages sent after withdrawal is processed.
- **Priority:** P0
- **Affected Channel(s):** Promotional email, SMS, WhatsApp outreach

### MREQ-3: Re-Notify All Pre-Existing Consent (Lead Database Remediation)
- **Obligation:** OBL-003 (Notice for Pre-existing Consent)
- **Requirement:** All contacts in the existing marketing database whose consent was obtained before DPDP Act commencement must receive a fresh notice as soon as reasonably practicable. Processing may continue only until the recipient withdraws consent. This covers all imported/purchased lead lists, legacy signups, and historical CRM contacts.
- **Acceptance Criteria:**
  - Full audit of all marketing databases (Mailchimp, HubSpot, internal CRM) identifying pre-commencement contacts.
  - Re-notification campaign sent within 60 days: email/SMS/WhatsApp depending on available channel, containing full notice (purpose, data, rights).
  - Contacts who do not respond get a second reminder; unengaged contacts after 90 days are moved to dormant status.
  - All re-notification sends and opt-out responses logged with timestamps.
- **Priority:** P0
- **Affected Channel(s):** Promotional email, SMS, WhatsApp outreach, purchased/imported lead lists

### MREQ-4: Valid Consent on Web Signup/Consent Forms
- **Obligation:** OBL-005 (Valid Consent)
- **Requirement:** All web signup and consent forms must collect consent that is free, specific, informed, unconditional, unambiguous, and via a clear affirmative action (opt-in, not pre-checked). Consent must be limited to personal data that is necessary for the stated marketing purpose.
- **Acceptance Criteria:**
  - No pre-checked consent boxes — all opt-ins require explicit user action (tick, toggle, button click).
  - Separate checkboxes for different purposes (promotional email, SMS, WhatsApp, analytics, personalised ads).
  - Consent is bundled only with the marketing purpose — not buried in terms of service or mandatory for unrelated services.
  - Consent record stored with: timestamp, IP, user agent, exact consent text shown, version of consent form.
  - Form does not allow submission without at least one explicit affirmative action (but user can decline all marketing).
- **Priority:** P0
- **Affected Channel(s):** Web signup/consent forms

### MREQ-5: Notice in Clear Plain Language with Language Options
- **Obligation:** OBL-006 (Clear Language for Consent Request), OBL-004 (Option for Language of Notice)
- **Requirement:** All consent requests and privacy notices in marketing channels must be in clear and plain language, not legalese. The data principal must have the option to access the notice in English or any language in the Eighth Schedule to the Indian Constitution (22 official languages).
- **Acceptance Criteria:**
  - All consent copy and privacy notices reviewed and rewritten in plain language (Flesch-Kincaid Grade 6 or below / B1 CEFR level).
  - Language selector prominently available on web consent forms for at least English + Hindi + top 5 Eighth Schedule languages based on audience composition.
  - Email/SMS/WhatsApp notices include a link to the language selection page.
  - Translation accuracy verified by native speakers or professional translation service.
- **Priority:** P1
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach

### MREQ-6: Consent Lifecycle Integration (CRM/ESP/Ad Platforms)
- **Obligation:** OBL-008 (Cessation of Processing on Withdrawal), OBL-010 (Burden of Proof for Consent)
- **Requirement:** Marketing automation platforms (CRM, email service provider, WhatsApp Business API, ad platforms) must be integrated with the central consent management system. Consent withdrawal, erasure, and preference changes must propagate to every downstream system. The burden of proof is on the data fiduciary — every consent record must be stored and retrievable for regulatory proceedings.
- **Acceptance Criteria:**
  - Webhook-based or API-based consent sync from central consent store to all marketing platforms (email ESP, SMS gateway, WhatsApp Business API, ad platforms, analytics tools).
  - Withdrawal on any channel is propagated to all other channels within 24 hours.
  - Consent records stored immutably with: timestamp, IP, user agent, consent text, version, channel of origination, channel(s) of propagation.
  - Quarterly audit export is produced and retained for a minimum of 7 years.
  - Integration tested with all active marketing platforms (list provided by eng team).
- **Priority:** P0
- **Affected Channel(s):** Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting, analytics/tracking pixels

### MREQ-7: Complete Block on Child Targeting — No Tracking or Behavioural Ads for Minors
- **Obligation:** OBL-024 (Restrictions on Child's Data Processing)
- **Requirement:** Marketing must not undertake tracking, behavioural monitoring, or targeted advertising directed at children. This covers all channels: ad platforms (Google Ads, Meta, programmatic), tracking pixels, analytics, retargeting, and email/SMS/WhatsApp outreach to known minors.
- **Acceptance Criteria:**
  - Age-gate mechanism on all signup forms: mandatory date-of-birth or age declaration before marketing communications can be enabled.
  - Ad platform audiences and campaign settings updated to exclude age < 18 targeting anywhere in India.
  - No retargeting pixels fire on pages where user has declared or is reasonably inferred to be a minor.
  - Analytics dashboards filter out or aggregate data from known minors (no individual profiling).
  - Existing marketing databases scrubbed: any contact known to be under 18 is moved to a restricted segment with no promotional outreach.
  - Parental consent flow (per OBL-022/OBL-044) implemented for services where child data is collected for non-marketing purposes.
- **Priority:** P0
- **Affected Channel(s):** Ad targeting & retargeting, analytics/tracking pixels, Web signup/consent forms, Promotional email, SMS, WhatsApp outreach

### MREQ-8: Erasure Pipeline — Delete Marketing Data on Request or Withdrawal
- **Obligation:** OBL-018 (Erasure of Personal Data), OBL-030 (Erasure upon Request), OBL-008 (Cessation of Processing on Withdrawal)
- **Requirement:** Marketing systems must erase a data principal's personal data upon withdrawal of consent, or upon request via rights exercise, unless retention is required by law. Erasure must also be triggered for inactive accounts after the prescribed period (3 years per Third Schedule).
- **Acceptance Criteria:**
  - Erasure request (via rights page, email, or consent withdrawal) triggers deletion from all marketing databases (CRM, ESP, SMS gateway, WhatsApp, ad platform audiences, analytics) within 7 business days.
  - Deletion is logged with timestamp and a confirmation sent to the data principal.
  - Inactive account erasure policy implemented: accounts with no login and no rights exercise within 3 years are flagged, given 48-hour notice per OBL-041, then erased.
  - Erasure confirmation from each downstream system verified — no zombie records retained in backups that are restored into production.
- **Priority:** P1
- **Affected Channel(s):** Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting, analytics/tracking pixels, purchased/imported lead lists

### MREQ-9: Accuracy Completeness of Purchased/Imported Lead Lists
- **Obligation:** OBL-014 (Completeness, Accuracy and Consistency)
- **Requirement:** If personal data from purchased or imported lead lists is used for marketing outreach (which itself requires a lawful basis), the data fiduciary must ensure the data is complete, accurate, and consistent before any marketing decision or disclosure is made based on it.
- **Acceptance Criteria:**
  - No purchased/imported lead list is used for marketing unless consent for that specific purpose can be verified.
  - Lead lists from third-party sources are validated against the consent requirements: each lead must have provable consent (source, timestamp, consent text) from the original collection point, or must go through the re-notification process (MREQ-3).
  - Data quality checks run on all imported lists: phone number format validation, email format validation, deduplication against existing DNC/unsubscribe lists.
  - Inaccurate data (invalid emails, wrong names, bounced contacts) is corrected or removed within 30 days.
  - Monthly data quality report generated showing accuracy rate per lead source.
- **Priority:** P1
- **Affected Channel(s):** Purchased/imported lead lists, SMS, WhatsApp outreach, Promotional email

### MREQ-10: Grievance Redressal & DPO Contact Published on Marketing Touchpoints
- **Obligation:** OBL-020 (Publishing Contact Information), OBL-021 (Grievance Redressal Mechanism), OBL-043 (Publishing Contact Information of DPO - Rule 9)
- **Requirement:** Marketing channels that are public-facing (website, promotional emails, SMS, WhatsApp) must prominently display the business contact information of the Data Protection Officer (or person able to answer questions about processing). An effective grievance redressal mechanism must be established and publicised, with responses within 90 days.
- **Acceptance Criteria:**
  - DPO contact (email/phone) and grievance portal link included on:
    - Website footer of all marketing landing pages.
    - Privacy/consent notice in promotional emails.
    - SMS and WhatsApp automated reply for "HELP" or grievance keywords.
  - Grievance portal accepts complaints via web form, email, and WhatsApp.
  - Auto-acknowledgement sent within 24 hours; substantive response within 90 days per Rule 14(3).
  - Monthly grievance dashboard showing: count, category, resolution time, escalation status.
- **Priority:** P1
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach

### MREQ-11: Ad-Targeting Opt-Out Sync — Honour Consent Withdrawal on Ad Platforms
- **Obligation:** OBL-007 (Right to Withdraw Consent), OBL-008 (Cessation of Processing on Withdrawal)
- **Requirement:** When a user withdraws consent for marketing personalisation or retargeting, the opt-out must propagate to ad platforms (Google Ads, Meta, LinkedIn, programmatic DSPs) to cease targeting and audience inclusion.
- **Acceptance Criteria:**
  - Consent withdrawal for ad personalisation triggers removal from all ad-platform customer-match audiences within 24 hours.
  - User is added to suppression/exclusion lists on all active ad platforms.
  - Automated check: weekly audit of audiences vs consent database to detect and correct stale inclusions.
  - No retargeting cookies/pixels fire for opted-out users (verified via browser testing).
  - Process documented for manual ad-platform exclusion for platforms without API access.
- **Priority:** P1
- **Affected Channel(s):** Ad targeting & retargeting, analytics/tracking pixels

### MREQ-12: Notice on Every Consent Request — Itemised Data and Purpose
- **Obligation:** OBL-035 (Rule 3 - Notice Content and Presentation)
- **Requirement:** Every consent request on marketing channels must be accompanied by an independently understandable notice that itemises each personal data element collected and each specific purpose, and provides a communication link for withdrawal, rights exercise, and complaints.
- **Acceptance Criteria:**
  - Web consent forms show a layered notice: brief summary + expandable detail for each data-purpose pair.
  - Consent flow cannot be completed without the notice being displayed (not hidden behind a link).
  - Notice includes direct communication link (URL or shortcode) for withdrawal, rights, and DPDP Board complaints.
  - SMS/WhatsApp consent notices are within the message body (not a link-only notice) with the link for further detail.
  - Notice template reviewed and approved by legal/compliance team.
- **Priority:** P0
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach

### MREQ-13: Breach Notification — Marketing Channels as Contact Vector
- **Obligation:** OBL-017 (Intimation of Personal Data Breach), OBL-039 (Rule 7 - Detailed Process)
- **Requirement:** In the event of a personal data breach involving marketing data, the marketing department must support breach notification by providing the contact channels (email, SMS, WhatsApp) and contact data for affected data principals. Notification must be dispatched without delay.
- **Acceptance Criteria:**
  - Incident response runbook includes marketing data contact extraction procedure.
  - Marketing automation systems can produce an affected-user contact list (email, phone, WhatsApp) within 4 hours of a verified breach.
  - Notification template pre-approved for email/SMS/WhatsApp channels containing: description, consequences, measures taken, safety steps for user, and DPO contact.
  - Marketing systems retain traffic and processing logs for at least 1 year per OBL-042 to support breach investigation.
- **Priority:** P2
- **Affected Channel(s):** Promotional email, SMS, WhatsApp outreach, analytics/tracking pixels, purchased/imported lead lists

### MREQ-14: Verifiable Parental Consent Flow for Child-Accessible Services
- **Obligation:** OBL-022 (Verifiable Consent for Child's Data), OBL-044 (Rule 10 - Due Diligence)
- **Requirement:** For any marketing-adjacent service that is accessible to minors and collects personal data (e.g., loyalty programme, newsletter, content gating), the signup flow must include verifiable parental consent. The marketing team must ensure no promotional processing occurs without verified parental consent for users under 18.
- **Acceptance Criteria:**
  - Age verification gate at point of data collection: if user indicates age < 18, flow redirects to parental consent.
  - Parental consent flow collects parent's verifiable identity details and explicit consent for the child's data processing.
  - Parent can withdraw consent on behalf of the child.
  - No marketing/promotional emails, SMS, WhatsApp, or personalised ads are sent to users whose parental consent is not verified.
  - Due diligence measures (per Rule 10) implemented to verify parent is an identifiable adult.
- **Priority:** P2
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting

### MREQ-15: Accuracy Correction Pipeline for Marketing Data
- **Obligation:** OBL-029 (Correction, Completion, Updating)
- **Requirement:** Data principals have the right to request correction, completion, or updating of their personal data. Marketing systems must support these rights — users must be able to correct their email, phone, name, and preferences via a self-service portal or request mechanism.
- **Acceptance Criteria:**
  - Self-service preference centre allows users to update: email, phone, name, communication preferences, language.
  - Updates propagate to all downstream marketing platforms within 48 hours.
  - Correction request via email/SMS is processed within 7 business days.
  - Audit log maintained of all correction requests and their resolution.
- **Priority:** P2
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach, purchased/imported lead lists

### MREQ-16: Consent Manager Interoperability
- **Obligation:** OBL-009 (Consent Manager)
- **Requirement:** Marketing consent infrastructure must support the Consent Manager model — data principals must be able to give, manage, review, or withdraw consent through a registered Consent Manager. Marketing systems must accept and honour consent signals from registered Consent Managers.
- **Acceptance Criteria:**
  - Marketing consent APIs documented to support Consent Manager integration.
  - When a user withdraws consent via a Consent Manager, the withdrawal is honoured in all marketing systems within 24 hours.
  - No marketing processing occurs for users where the Consent Manager signals no consent.
  - Integration with at least one registered Consent Manager tested in staging before go-live.
- **Priority:** P2
- **Affected Channel(s):** Web signup/consent forms, Promotional email, SMS, WhatsApp outreach, ad targeting & retargeting, analytics/tracking pixels
