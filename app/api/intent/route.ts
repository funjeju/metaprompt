import { NextResponse } from "next/server";
import { runIntent } from "@/lib/engine";
import { isLlmConfigured, LlmConfigError } from "@/lib/llm";
import { JsonParseError } from "@/lib/engine/json";
import {
  logAccess,
  logIntentSession,
  logUsage,
  newSessionId,
  hashIp,
} from "@/lib/logging";
import { checkGuestRateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { clientCountry, clientIp, jsonError, normalizeLocale } from "@/lib/http";

export const runtime = "nodejs"; // firebase-admin 은 Edge 불가

// POST /api/intent — 1층: 의도측정 + 객관식 질문.
// ⚠ docs/02 2.4: 질문만 반환하고 멈춘다. 절대 최종 프롬프트를 만들지 않는다.
export async function POST(req: Request) {
  if (!isLlmConfigured()) {
    return jsonError("LLM이 구성되지 않았습니다.", 503, "llm_unconfigured");
  }

  let body: { inputText?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400, "bad_json");
  }

  const inputText =
    typeof body.inputText === "string" ? body.inputText.trim() : "";
  if (!inputText) {
    return jsonError("inputText 가 비어 있습니다.", 400, "empty_input");
  }
  const locale = normalizeLocale(body.locale);

  // 로그인 사용자는 세션 소유 + rate limit 면제. 게스트만 IP 기준 제한.
  const sessionUser = await getSessionUser();
  const uid = sessionUser?.uid ?? null;
  const ipHash = hashIp(clientIp(req));
  if (!uid) {
    const rl = checkGuestRateLimit(ipHash);
    if (!rl.allowed) {
      return jsonError("오늘 체험 횟수를 초과했습니다.", 429, "rate_limited");
    }
  }

  try {
    const { result, usage } = await runIntent(inputText, locale);
    const sessionId = newSessionId();

    // 로깅은 best-effort — await 하되 실패해도 내부에서 무시된다.
    await Promise.all([
      logIntentSession({
        sessionId,
        uid,
        inputText,
        intentGuess: result.intentGuess,
        questions: result.questions,
        locale,
      }),
      logUsage({
        sessionId,
        uid,
        layer: "intent",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: usage.latencyMs,
      }),
      logAccess({
        uid,
        ipHash,
        country: clientCountry(req),
        path: "/api/intent",
        event: "page_view",
      }),
    ]);

    return NextResponse.json({
      sessionId,
      intentGuess: result.intentGuess,
      needsQuestions: result.needsQuestions,
      questions: result.questions,
    });
  } catch (err) {
    if (err instanceof LlmConfigError) {
      return jsonError(err.message, 503, "llm_unconfigured");
    }
    if (err instanceof JsonParseError) {
      console.error("[/api/intent] JSON 파싱 실패:", err.raw);
      return jsonError("응답 처리에 실패했습니다.", 502, "parse_error");
    }
    console.error("[/api/intent] 오류:", err);
    return jsonError("의도 분석에 실패했습니다.", 500, "intent_failed");
  }
}
