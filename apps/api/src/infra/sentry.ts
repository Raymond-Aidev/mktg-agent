import * as Sentry from "@sentry/node";
import { env } from "./env.ts";

/**
 * Sentry initialization. Only activates when SENTRY_DSN is present so
 * local dev / CI never spam Sentry quotas. Once initialized, Sentry's
 * Express integration auto-captures unhandled errors.
 *
 * Call initSentry() once at process boot, BEFORE any other modules
 * (Express, BullMQ, etc.) so the SDK can patch their globals.
 */

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  if (!env.SENTRY_DSN) return false;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.RELEASE_SHA ?? undefined,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });

  initialized = true;
  return true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) {
    // Still log so the error isn't silently dropped in dev.
    console.error("[sentry-noop]", err, context ?? {});
    return;
  }
  Sentry.captureException(err, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}

export const SentryHandlers = Sentry;
