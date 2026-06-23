import { createHash, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type {
  EngineAnswer,
  EngineQuestion,
  Locale,
} from "@/lib/engine/types";

// ════════════════════════════════════════════════════════════════
// 서버 전용 로깅 (docs/03). 모든 적재는 Admin SDK 경유.
// best-effort: Firestore 미설정/실패 시에도 절대 throw 하지 않는다
// (메인 생성 플로우가 로깅 때문에 깨지면 안 된다).
// ════════════════════════════════════════════════════════════════

export function newSessionId(): string {
  return randomUUID();
}

/** IP는 원본을 저장하지 않는다 — 해시만 (docs/03 3.4 개인정보). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function safe(op: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await op();
  } catch (err) {
    console.warn(`[logging] ${label} 실패(무시):`, err);
  }
}

// ── sessions ─────────────────────────────────────────────────────
export async function logIntentSession(input: {
  sessionId: string;
  uid: string | null;
  inputText: string;
  intentGuess: string;
  questions: EngineQuestion[];
  locale: Locale;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await safe(
    () =>
      db
        .collection("sessions")
        .doc(input.sessionId)
        .set({
          uid: input.uid,
          inputText: input.inputText,
          intentGuess: input.intentGuess,
          questions: input.questions,
          locale: input.locale,
          createdAt: FieldValue.serverTimestamp(),
        }),
    "logIntentSession",
  );
}

export async function completeSession(input: {
  sessionId: string;
  answers: EngineAnswer[];
  routedModule: string;
  finalPrompt: string;
  outputLang: Locale;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await safe(
    () =>
      db
        .collection("sessions")
        .doc(input.sessionId)
        .set(
          {
            answers: input.answers,
            routedModule: input.routedModule,
            finalPrompt: input.finalPrompt,
            outputLang: input.outputLang,
            completedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
    "completeSession",
  );
}

// ── usage_logs ───────────────────────────────────────────────────
export async function logUsage(input: {
  sessionId: string;
  uid: string | null;
  layer: "intent" | "generate";
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await safe(
    () =>
      db.collection("usage_logs").add({
        ...input,
        createdAt: FieldValue.serverTimestamp(),
      }),
    "logUsage",
  );
}

// ── access_logs ──────────────────────────────────────────────────
export async function logAccess(input: {
  uid: string | null;
  ipHash: string | null;
  country?: string | null;
  device?: string | null;
  path: string;
  event: "login" | "page_view" | "generate";
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await safe(
    () =>
      db.collection("access_logs").add({
        uid: input.uid,
        ipHash: input.ipHash,
        country: input.country ?? null,
        device: input.device ?? null,
        path: input.path,
        event: input.event,
        createdAt: FieldValue.serverTimestamp(),
      }),
    "logAccess",
  );
}
