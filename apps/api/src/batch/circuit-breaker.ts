import { getPoolForRole } from "../infra/db.ts";
import { setCircuitBreakerGauge } from "../infra/metrics.ts";

/**
 * Circuit Breaker for Category A batch sources.
 *
 * 정책 (docs/dlq-playbook.md §1, §7 참조):
 *   - 동일 source가 연속 3회 실패하면 → state="open"
 *   - open 상태는 30분 자동 유지 → 이후 half_open로 전환
 *   - half_open에서 다음 호출이 성공하면 closed, 실패하면 다시 open
 *
 * 워커는 핸들러 진입 전 `assertClosed(source)`를 호출한다. open 상태에서
 * 호출하면 CircuitOpenError를 던지고, 워커는 이를 catch하여 잡을 즉시
 * "ignored"로 처리한다(crawler_failures에 별도 row를 남기지 않음).
 *
 * 본 모듈은 batch_worker 롤로 동작하므로 RW 권한이 보장된다.
 */

const FAIL_THRESHOLD = 3;
const OPEN_DURATION_MS = 30 * 60_000;

export type BreakerState = "closed" | "open" | "half_open";

export class CircuitOpenError extends Error {
  constructor(
    public readonly source: string,
    public readonly openUntil: Date,
  ) {
    super(`circuit breaker OPEN for source="${source}" until ${openUntil.toISOString()}`);
    this.name = "CircuitOpenError";
  }
}

interface BreakerRow {
  state: BreakerState;
  consecutive_failures: number;
  open_until: Date | null;
}

/**
 * Throws CircuitOpenError when the breaker for `source` is currently open.
 * If `open_until` has elapsed, transitions the row to half_open and returns
 * normally so the next call may proceed.
 */
export async function assertClosed(source: string): Promise<void> {
  const pool = getPoolForRole("batch_worker");
  const r = await pool.query<BreakerRow>(
    `SELECT state, consecutive_failures, open_until
       FROM circuit_breaker_state
      WHERE source = $1`,
    [source],
  );
  const row = r.rows[0];
  if (!row || row.state === "closed") return;

  if (row.state === "open") {
    const until = row.open_until;
    if (until && until.getTime() <= Date.now()) {
      // window elapsed → allow one probe
      await pool.query(
        `UPDATE circuit_breaker_state
            SET state = 'half_open', updated_at = now()
          WHERE source = $1`,
        [source],
      );
      setCircuitBreakerGauge(source, "half_open");
      return;
    }
    throw new CircuitOpenError(source, until ?? new Date(Date.now() + OPEN_DURATION_MS));
  }
  // half_open → allow probe
}

/**
 * Records a successful run. Resets counters and transitions the row to closed.
 */
export async function recordSuccess(source: string): Promise<void> {
  const pool = getPoolForRole("batch_worker");
  await pool.query(
    `INSERT INTO circuit_breaker_state (source, state, consecutive_failures, last_success_at, updated_at)
     VALUES ($1, 'closed', 0, now(), now())
     ON CONFLICT (source) DO UPDATE
       SET state                = 'closed',
           consecutive_failures = 0,
           last_success_at      = now(),
           opened_at            = NULL,
           open_until           = NULL,
           updated_at           = now()`,
    [source],
  );
  setCircuitBreakerGauge(source, "closed");
}

/**
 * Records a failure. After FAIL_THRESHOLD consecutive failures, opens the
 * breaker for OPEN_DURATION_MS. Returns the resulting state for callers
 * that want to log it.
 */
export async function recordFailure(source: string): Promise<BreakerState> {
  const pool = getPoolForRole("batch_worker");
  const updated = await pool.query<BreakerRow>(
    `INSERT INTO circuit_breaker_state (source, consecutive_failures, last_failure_at, updated_at)
     VALUES ($1, 1, now(), now())
     ON CONFLICT (source) DO UPDATE
       SET consecutive_failures = circuit_breaker_state.consecutive_failures + 1,
           last_failure_at      = now(),
           updated_at           = now()
     RETURNING state, consecutive_failures, open_until`,
    [source],
  );
  const row = updated.rows[0];
  if (!row) return "closed";

  if (row.consecutive_failures >= FAIL_THRESHOLD && row.state !== "open") {
    const openUntil = new Date(Date.now() + OPEN_DURATION_MS);
    await pool.query(
      `UPDATE circuit_breaker_state
          SET state      = 'open',
              opened_at  = now(),
              open_until = $2,
              updated_at = now()
        WHERE source = $1`,
      [source, openUntil],
    );
    setCircuitBreakerGauge(source, "open");
    return "open";
  }
  setCircuitBreakerGauge(source, row.state);
  return row.state;
}

/** Lightweight read for observability — not used in the hot path. */
export async function snapshot(): Promise<
  Array<{
    source: string;
    state: BreakerState;
    consecutiveFailures: number;
    openUntil: string | null;
  }>
> {
  const pool = getPoolForRole("batch_worker");
  const r = await pool.query<{
    source: string;
    state: BreakerState;
    consecutive_failures: number;
    open_until: Date | null;
  }>(
    `SELECT source, state, consecutive_failures, open_until
       FROM circuit_breaker_state
      ORDER BY source`,
  );
  return r.rows.map((row) => ({
    source: row.source,
    state: row.state,
    consecutiveFailures: row.consecutive_failures,
    openUntil: row.open_until?.toISOString() ?? null,
  }));
}
