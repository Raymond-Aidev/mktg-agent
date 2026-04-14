import nodemailer from "nodemailer";
import { env } from "./env.ts";

const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const baseUrl = env.PUBLIC_BASE_URL ?? "http://localhost:5173";
  const resetLink = `${baseUrl}?resetToken=${resetToken}`;

  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to}`);
    console.log(`[mailer] Reset link: ${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: `"GoldenCheck" <${env.SMTP_USER}>`,
    to,
    subject: "[GoldenCheck] 비밀번호 재설정",
    html: `
      <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
        <h2 style="color:#4F46E5;margin-bottom:24px">비밀번호 재설정</h2>
        <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>
        <p>이 링크는 <strong>1시간</strong> 동안 유효합니다.</p>
        <a href="${resetLink}"
           style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 32px;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0">
          비밀번호 재설정
        </a>
        <p style="color:#888;font-size:13px;margin-top:32px">
          본인이 요청하지 않았다면 이 메일을 무시하세요.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
        <p style="color:#aaa;font-size:12px">GoldenCheck &copy; 2026</p>
      </div>
    `,
  });

  console.log(`[mailer] Password reset email sent to ${to}`);
}
