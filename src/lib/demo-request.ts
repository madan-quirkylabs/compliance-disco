import { createServerFn } from "@tanstack/react-start";

/**
 * Demo-request intake.
 *
 * The Resend key is read here, inside the server function, and never crosses to
 * the client. Do not move this call into a component or a loader that runs in
 * the browser — that would ship the key in the bundle.
 */

export type DemoRequest = {
  name: string;
  email: string;
  company: string;
  regulations: string;
  message: string;
  /** Honeypot. Bots fill it; humans never see it. */
  website?: string;
};

export type DemoRequestResult =
  | { ok: true }
  | { ok: false; error: string };

// Where demo requests land.
const RECIPIENTS = ["justin+hermes@masonry.studio", "mkr.coder@gmail.com"];

// Until a sending domain is verified in Resend, this is the only permitted
// From address, and delivery is limited to the account owner's own inbox.
const FROM = "RegulatoryFabric <onboarding@resend.dev>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: DemoRequest): DemoRequest {
  const name = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const company = data.company?.trim() ?? "";

  if (!name) throw new Error("Enter your name.");
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid work email address.");
  if (!company) throw new Error("Enter your company.");

  return {
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    company: company.slice(0, 160),
    regulations: (data.regulations ?? "").trim().slice(0, 200),
    message: (data.message ?? "").trim().slice(0, 2000),
    website: data.website ?? "",
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function renderEmail(data: DemoRequest): string {
  const row = (label: string, value: string) =>
    value
      ? `<tr>
           <td style="padding:6px 16px 6px 0;color:#64748d;font:400 13px system-ui;vertical-align:top;white-space:nowrap">${label}</td>
           <td style="padding:6px 0;color:#0d253d;font:400 14px system-ui">${escapeHtml(value)}</td>
         </tr>`
      : "";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <p style="font:500 11px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#533afd;margin:0 0 6px">
        RegulatoryFabric
      </p>
      <h1 style="font:300 24px system-ui;letter-spacing:-.5px;color:#0d253d;margin:0 0 20px">
        New demo request
      </h1>
      <table style="border-collapse:collapse;width:100%">
        ${row("Name", data.name)}
        ${row("Email", data.email)}
        ${row("Company", data.company)}
        ${row("Regulations", data.regulations)}
      </table>
      ${
        data.message
          ? `<p style="font:400 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8c9bb2;margin:24px 0 6px">Message</p>
             <p style="font:400 14px/1.6 system-ui;color:#273951;margin:0;padding:14px 16px;background:#f6f9fc;border-left:2px solid #533afd;border-radius:0 8px 8px 0;white-space:pre-wrap">${escapeHtml(data.message)}</p>`
          : ""
      }
    </div>`;
}

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<DemoRequestResult> => {
    // Honeypot filled means a bot. Return success so it learns nothing.
    if (data.website) return { ok: true };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set; demo request dropped.");
      return { ok: false, error: "Email is not configured. Please email us directly." };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: RECIPIENTS,
      replyTo: data.email,
      subject: `Demo request — ${data.company}`,
      html: renderEmail(data),
    });

    if (error) {
      console.error("Resend rejected the demo request:", error);
      return { ok: false, error: "We could not send that just now. Please try again." };
    }

    return { ok: true };
  });
