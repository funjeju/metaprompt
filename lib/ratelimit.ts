// 게스트(비로그인) 무료 체험 rate limit.
// DECISION: 1일 N회 제한 (docs/05 5.2 기본값).
// ⚠ MVP 구현: 인메모리라 서버 인스턴스마다 카운트가 분리된다(서버리스 다중 인스턴스에서
//   느슨한 상한). 정밀 제한이 필요해지면 Firestore/Upstash 등으로 교체할 자리.

const GUEST_DAILY_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/** key 보통 ipHash. uid 가 있으면(로그인) 제한하지 않는다. */
export function checkGuestRateLimit(key: string | null): RateLimitResult {
  const limit = GUEST_DAILY_LIMIT;
  if (!key) {
    // 식별 불가 시 일단 허용(과도 차단 방지). 추후 정책 강화 자리.
    return { allowed: true, remaining: limit, limit };
  }

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + DAY_MS });
    return { allowed: true, remaining: limit - 1, limit };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, limit };
}
