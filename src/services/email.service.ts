import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject,
    html: `<p>${body}</p>`,
  });
}