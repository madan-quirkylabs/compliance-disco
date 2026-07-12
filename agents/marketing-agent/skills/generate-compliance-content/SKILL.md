---
name: generate-compliance-content
description: Produce customer-facing compliance guides, checklists, and FAQs for any regulation
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, marketing, content, regulation-agnostic]
---

# Generate Compliance Content

## When to Use
When producing business-facing compliance materials. Trigger: "write guide", "create checklist", "generate content".

## Procedure
1. Read all files in `workspace/shared-data/extracted-regulations/`.
2. Read dispatch instructions from `workspace/shared-data/handoffs/coord-to-marketing.md`.
   The dispatch file contains the `regulation_name` and `source_body`.
3. Produce four deliverables in `workspace/shared-data/marketing-output/`:

### compliance-guide.md
- Executive summary of the regulation (use the regulation name from extracted data)
- Who must comply (adapt actor terms to the specific regulation)
- Key obligations with plain-English explanations
- Penalties table (amount, offense, likelihood)
- 30-60-90 day action plan

### checklist.md
- Itemized checklist with checkboxes
- Columns: Action Item | Deadline | Responsible Role | Priority | Section/Article Reference
- Sort by priority (Critical → High → Medium → Low)
- Include estimated effort per item

### faq.md
- 15-20 questions a business owner would ask about this specific regulation
- Format: **Q:** ... **A:** ...
- Every answer cites the specific section/article of the regulation
- Adapt common questions to the regulation context (e.g., DPDP → "DPO?", SEBI → "compliance officer?")

### blog-post.md
- 800-1200 word announcement-style blog post
- Title format: "{Regulation Name}: What Your Business Needs to Know in {Year}"
- Tone: authoritative but accessible
- Include a CTA at the end

4. Write completion handoff.

## Pitfalls
- Don't use legal jargon without defining it first.
- Checklists must be actionable, not vague ("Implement consent mechanism" not "Think about consent").
- Blog post should not copy-paste from the guide.
- Each regulation has different actor terms — don't use DPDP terms (Data Fiduciary) for SEBI regulations.
