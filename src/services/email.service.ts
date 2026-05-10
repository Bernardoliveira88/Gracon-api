import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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