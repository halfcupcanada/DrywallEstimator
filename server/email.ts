/**
 * Email utility using Resend SDK.
 * Sends transactional emails for team invites.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInviteEmail({
  toEmail,
  toName,
  inviterName,
  companyName,
  inviteUrl,
}: {
  toEmail: string;
  toName?: string;
  inviterName: string;
  companyName: string;
  inviteUrl: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "DrywallPro by HalfCup <noreply@halfcup.ca>",
      to: toEmail,
      subject: `${inviterName} invited you to join ${companyName} on DrywallPro`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Team Invite</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#ea580c;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.2);border-radius:8px;padding:8px 12px;">
                    <span style="color:#ffffff;font-weight:700;font-size:16px;">DrywallPro</span>
                    <span style="color:rgba(255,255,255,0.7);font-size:11px;display:block;margin-top:1px;letter-spacing:0.05em;">BY HALFCUP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">You're invited!</h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">
                <strong style="color:#111827;">${inviterName}</strong> has invited ${toName ? `<strong style="color:#111827;">${toName}</strong>` : "you"} to join
                <strong style="color:#111827;">${companyName}</strong> on DrywallPro — the fastest way to estimate drywall materials.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#ea580c;border-radius:8px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Or copy this link into your browser:</p>
              <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;background:#f3f4f6;padding:10px 12px;border-radius:6px;">${inviteUrl}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This invite was sent by ${inviterName} via DrywallPro by HalfCup.<br>
                If you didn't expect this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Failed to send invite:", err);
    return false;
  }
}
