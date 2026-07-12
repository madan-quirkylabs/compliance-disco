import { useEffect, useState } from "react";

/**
 * Cookie consent.
 *
 * This is a compliance product, so the banner has to survive the standard it
 * sells. Three rules it must not break:
 *
 *   1. Non-essential categories are OFF until someone turns them on. No
 *      pre-ticked boxes (the product's own DPDP s.6(1) finding).
 *   2. Rejecting is exactly as easy as accepting. Same prominence, same click
 *      count, same visual weight (DPDP s.6(4) — withdrawal as easy as consent).
 *   3. The choice is recorded with a timestamp and a version, so it can be
 *      evidenced later. A consent you cannot prove is not a consent.
 *
 * Non-essential scripts must gate on `hasConsent(category)` — never fire on
 * mount and ask later.
 */

const STORAGE_KEY = "rf.consent";
const POLICY_VERSION = 1;

export type ConsentCategories = {
  essential: true; // Always on. Cannot be switched off; the site will not run.
  analytics: boolean;
  marketing: boolean;
};

type ConsentRecord = {
  version: number;
  decidedAt: string;
  categories: ConsentCategories;
};

const DENY_ALL: ConsentCategories = { essential: true, analytics: false, marketing: false };
const ALLOW_ALL: ConsentCategories = { essential: true, analytics: true, marketing: true };

function read(): ConsentRecord | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    // A new policy version invalidates the old choice. Ask again.
    return parsed.version === POLICY_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/** Gate every non-essential script on this. */
export function hasConsent(category: keyof ConsentCategories): boolean {
  const record = read();
  if (!record) return category === "essential";
  return Boolean(record.categories[category]);
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customising, setCustomising] = useState(false);
  const [draft, setDraft] = useState<ConsentCategories>(DENY_ALL);

  useEffect(() => {
    // Only prompt when no valid decision exists.
    if (!read()) setOpen(true);
  }, []);

  function decide(categories: ConsentCategories) {
    const record: ConsentRecord = {
      version: POLICY_VERSION,
      decidedAt: new Date().toISOString(),
      categories,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cc-title"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
        <h2 id="cc-title" className="text-base font-medium text-foreground">
          Cookies on this site
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We need a few cookies to make the site work. Anything beyond that stays switched off
          unless you turn it on. You can change your mind whenever you like.
        </p>

        {customising && (
          <fieldset className="mt-4 flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Choose what you allow
            </legend>

            <label className="flex items-start gap-3 opacity-70">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-1 size-4 accent-primary"
                aria-describedby="cc-essential"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Essential <span className="font-normal text-muted-foreground">(always on)</span>
                </span>
                <span id="cc-essential" className="block text-xs text-muted-foreground">
                  Security, load balancing, and remembering this choice.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={draft.analytics}
                onChange={(e) => setDraft({ ...draft, analytics: e.target.checked })}
                className="mt-1 size-4 accent-primary"
                aria-describedby="cc-analytics"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Analytics</span>
                <span id="cc-analytics" className="block text-xs text-muted-foreground">
                  Which pages get read, so we know what to improve.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={draft.marketing}
                onChange={(e) => setDraft({ ...draft, marketing: e.target.checked })}
                className="mt-1 size-4 accent-primary"
                aria-describedby="cc-marketing"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Marketing</span>
                <span id="cc-marketing" className="block text-xs text-muted-foreground">
                  Measuring whether an ad brought you here.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {/* Reject and Accept carry identical weight. That is the whole point. */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {customising ? (
            <button
              type="button"
              onClick={() => decide(draft)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Save my choices
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => decide(ALLOW_ALL)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => decide(DENY_ALL)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Reject all
              </button>
            </>
          )}

          {!customising && (
            <button
              type="button"
              onClick={() => setCustomising(true)}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:ml-auto"
            >
              Choose what you allow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
