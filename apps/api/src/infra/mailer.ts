import nodemailer from "nodemailer";
import { env } from "./env.ts";

const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
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

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping verification email to ${to}`);
    console.log(`[mailer] Verification code: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"GoldenCheck" <${env.SMTP_USER}>`,
    to,
    subject: "[GoldenCheck] 이메일 인증 코드",
    html: `
      <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
        <h2 style="color:#4F46E5;margin-bottom:24px">이메일 인증</h2>
        <p>아래 인증 코드를 입력하여 이메일 인증을 완료하세요.</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4F46E5">${code}</span>
        </div>
        <p>이 코드는 <strong>10분</strong> 동안 유효합니다.</p>
        <p style="color:#888;font-size:13px;margin-top:32px">
          본인이 요청하지 않았다면 이 메일을 무시하세요.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
        <p style="color:#aaa;font-size:12px">GoldenCheck &copy; 2026</p>
      </div>
    `,
  });

  console.log(`[mailer] Verification email sent to ${to}`);
}
