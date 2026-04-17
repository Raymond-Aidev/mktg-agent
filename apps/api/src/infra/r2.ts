import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env.ts";

/**
 * Cloudflare R2 client (S3-compatible).
 *
 * Phase 5 W16~W19: SignalCraft PDF 리포트 + 아카이브 페이로드를 R2에
 * 업로드한다. R2는 Egress 요금이 없어 Railway에서 생성한 파일을
 * 사용자에게 직접 공급할 수 있다.
 *
 * 설정 절차 (docs/goldencheck-launch-runbook.md 확장 예정):
 *   1. Cloudflare R2 → Create bucket `goldencheck-reports`
 *   2. Manage API Tokens → S3 Auth → R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
 *   3. Bucket → Settings → Public Access: optional Custom Domain
 *   4. Railway Variables 주입:
 *        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *        R2_BUCKET, (R2_PUBLIC_URL_BASE)
 *
 * 환경 변수 미설정 시 `isR2Configured()`가 false를 반환하며, 상위
 * 호출자(/reports/:id/pdf 등)는 503을 반환하도록 설계됨.
 */

let cachedClient: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET,
  );
}

export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;
  if (!isR2Configured()) {
    throw new Error("R2 is not configured (missing R2_ACCOUNT_ID/KEY/SECRET/BUCKET)");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

export async function putR2Object(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/**
 * Return a URL the caller can GET.
 *   - If R2_PUBLIC_URL_BASE is set (custom domain attached to bucket), return
 *     a direct public URL — no signing needed.
 *   - Otherwise, return a presigned GET URL with 1 hour expiry.
 */
export async function getR2Url(key: string, expiresInSeconds = 3600): Promise<string> {
  if (env.R2_PUBLIC_URL_BASE) {
    const base = env.R2_PUBLIC_URL_BASE.replace(/\/$/, "");
    return `${base}/${key}`;
  }
  const client = getR2Client();
  const cmd = new GetObjectCommand({ Bucket: env.R2_BUCKET!, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}
