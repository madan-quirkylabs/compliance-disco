---
name: watch-regulatory-feeds
description: Poll regulatory body websites and RSS feeds for new publications
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, monitoring, regulatory, rss, scraping]
---

# Watch Regulatory Feeds

## When to Use
On a cron schedule (e.g., every 6 hours or daily). Trigger: cron tick, "check for updates", "scan regulatory sources".

## Procedure
1. Load known items from `workspace/shared-data/monitored-sources/known-items.json`.
   If it doesn't exist, create an empty `{"sources": {}}`.
2. For each monitored source (defined in SOUL.md):
   a. Fetch the source page/feed using web tools.
   b. Parse the response for: title, date, URL, and PDF link (if available).
   c. Compare against known items for that source.
   d. Any item NOT in known-items.json is new → flag it.
3. For each new item:
   a. Download the PDF (if available) to `docs/regulations/{body}/`
   b. If no PDF, save the page text as `docs/regulations/{body}/{date}-{title-slug}.md`
   c. Write detection entry (see format below).
4. Update `known-items.json` with all newly seen items.
5. If any new items were found, write the monitor-to-coordinator handoff.
6. If nothing new, respond with `[SILENT]`.

## Detection Entry Format
```json
{
  "id": "SEBI-2026-045",
  "source": "SEBI",
  "title": "Circular on Data Protection Requirements",
  "date": "2026-07-10",
  "url": "https://sebi.gov.in/circulars/...",
  "local_path": "docs/regulations/sebi/2026-07-10-data-protection-requirements.pdf",
  "detected_at": "2026-07-12T10:00:00Z",
  "status": "pending_extraction"
}
```

## Known Items Format (known-items.json)
```json
{
  "sources": {
    "SEBI": {
      "last_checked": "2026-07-12T10:00:00Z",
      "items": ["SEBI-2026-044", "SEBI-2026-043"]
    },
    "AMFI": {
      "last_checked": "2026-07-12T10:00:00Z",
      "items": ["AMFI-2026-012"]
    }
  }
}
```

## Pitfalls
- SEBI's website changes structure frequently — don't hardcode CSS selectors.
- Some circulars are scanned images — use OCR tools if text extraction fails.
- Rate-limit requests: max 1 request per source per 5 minutes.
- PDFs can be large (>10MB) — download to disk, don't buffer in memory.
