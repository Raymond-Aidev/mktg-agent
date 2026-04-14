import net from "node:net";
import tls from "node:tls";
import { env } from "./env.ts";

/**
 * Python smtplib 방식과 동일한 raw SMTP 클라이언트.
 * nodemailer가 Railway에서 IPv6 시도 → 타임아웃 문제를 우회하기 위해
 * net.createConnection으로 직접 IPv4 소켓을 생성합니다.
 */
async function sendRawSmtp(to: string, subject: string, html: string): Promise<void> {
  const user = env.SMTP_USER!;
  const pass = env.SMTP_PASS!;
  const from = `"GoldenCheck" <noreply@konnect-ai.net>`;

  const boundary = `----boundary${Date.now()}`;
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: "smtp.gmail.com", port: 587, family: 4, timeout: 30000 },
      () => {
        console.log("[mailer] TCP connected to smtp.gmail.com:587 (IPv4)");
      },
    );

    socket.setTimeout(30000);
    let buffer = "";
    let step = 0;
    let tlsSocket: tls.TLSSocket | null = null;

    const getActiveSocket = () => tlsSocket ?? socket;

    const send = (cmd: string) => {
      getActiveSocket().write(cmd + "\r\n");
    };

    const handleLine = (line: string) => {
      const code = parseInt(line.substring(0, 3), 10);
      // 멀티라인 응답 중간이면 무시 (4번째 문자가 '-')
      if (line.length > 3 && line[3] === "-") return;

      switch (step) {
        case 0: // 서버 greeting
          if (code === 220) {
            step = 1;
            send("EHLO goldencheck.kr");
          } else reject(new Error(`SMTP greeting failed: ${line}`));
          break;
        case 1: // EHLO 응답
          if (code === 250) {
            step = 2;
            send("STARTTLS");
          }
          break;
        case 2: // STARTTLS 응답
          if (code === 220) {
            step = 3;
            tlsSocket = tls.connect({ socket, servername: "smtp.gmail.com" }, () => {
              send("EHLO goldencheck.kr");
            });
            tlsSocket.setEncoding("utf8");
            buffer = "";
            tlsSocket.on("data", onData);
            tlsSocket.on("error", (err) => reject(err));
          } else reject(new Error(`STARTTLS failed: ${line}`));
          break;
        case 3: // EHLO after TLS
          if (code === 250) {
            step = 4;
            const authStr = Buffer.from(`\0${user}\0${pass}`).toString("base64");
            send(`AUTH PLAIN ${authStr}`);
          }
          break;
        case 4: // AUTH 응답
          if (code === 235) {
            step = 5;
            send(`MAIL FROM:<noreply@konnect-ai.net>`);
          } else reject(new Error(`AUTH failed: ${line}`));
          break;
        case 5: // MAIL FROM 응답
          if (code === 250) {
            step = 6;
            send(`RCPT TO:<${to}>`);
          } else reject(new Error(`MAIL FROM failed: ${line}`));
          break;
        case 6: // RCPT TO 응답
          if (code === 250) {
            step = 7;
            send("DATA");
          } else reject(new Error(`RCPT TO failed: ${line}`));
          break;
        case 7: // DATA 응답
          if (code === 354) {
            step = 8;
            send(mime + "\r\n.");
          } else reject(new Error(`DATA failed: ${line}`));
          break;
        case 8: // 메시지 전송 응답
          if (code === 250) {
            step = 9;
            send("QUIT");
            resolve();
          } else reject(new Error(`Message send failed: ${line}`));
          break;
        case 9: // QUIT
          getActiveSocket().end();
          break;
      }
    };

    const onData = (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.substring(0, idx);
        buffer = buffer.substring(idx + 2);
        handleLine(line);
      }
    };

    socket.setEncoding("utf8");
    socket.on("data", onData);
    socket.on("error", (err) => reject(err));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timeout (30s)"));
    });
  });
}

// SMTP 설정 확인
const smtpConfigured = !!(env.SMTP_USER && env.SMTP_PASS);
if (smtpConfigured) {
  console.log(`[mailer] SMTP configured for ${env.SMTP_USER}, testing connection...`);
  // 시작 시 연결 테스트 (fire-and-forget)
  sendRawSmtp(
    env.SMTP_USER!,
    "[GoldenCheck] SMTP Test",
    "<p>SMTP connection test — ignore this email.</p>",
  )
    .then(() => console.log("[mailer] SMTP test email sent OK"))
    .catch((err) => console.error("[mailer] SMTP test FAILED:", err.message));
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const baseUrl = env.PUBLIC_BASE_URL ?? "http://localhost:5173";
  const resetLink = `${baseUrl}?resetToken=${resetToken}`;

  if (!smtpConfigured) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to}`);
    console.log(`[mailer] Reset link: ${resetLink}`);
    return;
  }

  await sendRawSmtp(
    to,
    "[GoldenCheck] 비밀번호 재설정",
    `
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
  );

  console.log(`[mailer] Password reset email sent to ${to}`);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!smtpConfigured) {
    console.log(`[mailer] SMTP not configured — skipping verification email to ${to}`);
    console.log(`[mailer] Verification code: ${code}`);
    return;
  }

  await sendRawSmtp(
    to,
    "[GoldenCheck] 이메일 인증 코드",
    `
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
  );

  console.log(`[mailer] Verification email sent to ${to}`);
}
