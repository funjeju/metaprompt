import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { estimateCostUsd } from "./cost";

// ════════════════════════════════════════════════════════════════
// 어드민 집계 (docs/04 4.3, docs/03 3.5).
// MVP: access_logs/usage_logs 를 최근 N일 범위로 bounded read 후 코드 집계.
// ⚠ 데이터가 커지면 일배치 요약 문서로 교체할 자리 (docs/03 3.5).
// ════════════════════════════════════════════════════════════════

const READ_LIMIT = 5000;
const SERIES_DAYS = 14;
const WINDOW_DAYS = 30;

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD
}
function toMs(v: unknown): number | null {
  if (v instanceof Timestamp) return v.toMillis();
  if (v && typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

export interface AdminOverview {
  configured: boolean;
  users: number;
  sessions: number;
  generates: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  dailyActive: { date: string; count: number }[];
  eventBreakdown: { event: string; count: number }[];
  llmCalls: number;
  tokensInput: number;
  tokensOutput: number;
  estCostUsd: number;
  avgLatencyMs: number;
  byModel: {
    model: string;
    calls: number;
    input: number;
    output: number;
    costUsd: number;
  }[];
}

const EMPTY: AdminOverview = {
  configured: false,
  users: 0,
  sessions: 0,
  generates: 0,
  activeToday: 0,
  activeWeek: 0,
  activeMonth: 0,
  dailyActive: [],
  eventBreakdown: [],
  llmCalls: 0,
  tokensInput: 0,
  tokensOutput: 0,
  estCostUsd: 0,
  avgLatencyMs: 0,
  byModel: [],
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = getAdminDb();
  if (!db) return EMPTY;

  const now = Date.now();
  const windowStart = Timestamp.fromMillis(now - WINDOW_DAYS * 86400_000);
  const dayMs = 86400_000;

  try {
    const [usersCount, sessionsCount, accessSnap, usageSnap] =
      await Promise.all([
        db.collection("users").count().get(),
        db.collection("sessions").count().get(),
        db
          .collection("access_logs")
          .where("createdAt", ">=", windowStart)
          .orderBy("createdAt", "desc")
          .limit(READ_LIMIT)
          .get(),
        db
          .collection("usage_logs")
          .where("createdAt", ">=", windowStart)
          .orderBy("createdAt", "desc")
          .limit(READ_LIMIT)
          .get(),
      ]);

    // ── access_logs 집계 ──
    const eventCounts = new Map<string, number>();
    const dailyIdentities = new Map<string, Set<string>>();
    const activeToday = new Set<string>();
    const activeWeek = new Set<string>();
    const activeMonth = new Set<string>();
    let generates = 0;

    accessSnap.forEach((doc) => {
      const d = doc.data();
      const ms = toMs(d.createdAt);
      const event = typeof d.event === "string" ? d.event : "unknown";
      eventCounts.set(event, (eventCounts.get(event) ?? 0) + 1);
      if (event === "generate") generates += 1;

      const identity =
        (d.uid as string | null) ?? (d.ipHash as string | null) ?? null;
      if (ms !== null && identity) {
        const key = dayKey(ms);
        if (!dailyIdentities.has(key)) dailyIdentities.set(key, new Set());
        dailyIdentities.get(key)!.add(identity);
        if (now - ms <= dayMs) activeToday.add(identity);
        if (now - ms <= 7 * dayMs) activeWeek.add(identity);
        activeMonth.add(identity);
      }
    });

    // 최근 SERIES_DAYS 일 시계열 (빈 날 0 채움).
    const dailyActive: { date: string; count: number }[] = [];
    for (let i = SERIES_DAYS - 1; i >= 0; i--) {
      const key = dayKey(now - i * dayMs);
      dailyActive.push({ date: key, count: dailyIdentities.get(key)?.size ?? 0 });
    }

    // ── usage_logs 집계 ──
    let tokensInput = 0;
    let tokensOutput = 0;
    let estCostUsd = 0;
    let latencySum = 0;
    let latencyN = 0;
    const modelAgg = new Map<
      string,
      { calls: number; input: number; output: number; costUsd: number }
    >();

    usageSnap.forEach((doc) => {
      const d = doc.data();
      const model = typeof d.model === "string" ? d.model : "unknown";
      const input = Number(d.inputTokens) || 0;
      const output = Number(d.outputTokens) || 0;
      const cost = estimateCostUsd(model, input, output);
      tokensInput += input;
      tokensOutput += output;
      estCostUsd += cost;
      if (typeof d.latencyMs === "number") {
        latencySum += d.latencyMs;
        latencyN += 1;
      }
      const agg =
        modelAgg.get(model) ?? { calls: 0, input: 0, output: 0, costUsd: 0 };
      agg.calls += 1;
      agg.input += input;
      agg.output += output;
      agg.costUsd += cost;
      modelAgg.set(model, agg);
    });

    return {
      configured: true,
      users: usersCount.data().count,
      sessions: sessionsCount.data().count,
      generates,
      activeToday: activeToday.size,
      activeWeek: activeWeek.size,
      activeMonth: activeMonth.size,
      dailyActive,
      eventBreakdown: [...eventCounts.entries()].map(([event, count]) => ({
        event,
        count,
      })),
      llmCalls: usageSnap.size,
      tokensInput,
      tokensOutput,
      estCostUsd,
      avgLatencyMs: latencyN > 0 ? Math.round(latencySum / latencyN) : 0,
      byModel: [...modelAgg.entries()]
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.costUsd - a.costUsd),
    };
  } catch (err) {
    console.warn("[admin/stats] 집계 실패:", err);
    return { ...EMPTY, configured: true };
  }
}

// ── 목록 조회 (하위 페이지) ──────────────────────────────────────
export interface UserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  planTier: string;
  lastLoginMs: number | null;
}

export async function listUsers(limit = 100): Promise<UserRow[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection("users")
      .orderBy("lastLoginAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        role: data.role ?? "user",
        planTier: data.planTier ?? "free",
        lastLoginMs: toMs(data.lastLoginAt),
      };
    });
  } catch (err) {
    console.warn("[admin/listUsers] 실패:", err);
    return [];
  }
}

export interface SessionRow {
  id: string;
  uid: string | null;
  inputText: string;
  routedModule: string | null;
  createdMs: number | null;
}

export async function listSessions(limit = 100): Promise<SessionRow[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection("sessions")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: data.uid ?? null,
        inputText: data.inputText ?? "",
        routedModule: data.routedModule ?? null,
        createdMs: toMs(data.createdAt),
      };
    });
  } catch (err) {
    console.warn("[admin/listSessions] 실패:", err);
    return [];
  }
}
