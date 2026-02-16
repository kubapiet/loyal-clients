import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(to: string, magicLinkUrl: string) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to,
    subject: "Twój link do logowania — LoyaltyApp",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Logowanie do LoyaltyApp</h2>
        <p>Kliknij poniższy link, aby się zalogować. Link jest ważny przez 15 minut.</p>
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Zaloguj się
        </a>
        <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
          Jeśli nie prosiłeś o ten link, zignoruj tę wiadomość.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
