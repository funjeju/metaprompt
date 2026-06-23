import { NextResponse } from "next/server";
import { runBlueprint, runSynthesis, type EngineAnswer } from "@/lib/engine";
import { isLlmConfigured, LlmConfigError } from "@/lib/llm";
import { JsonParseError } from "@/lib/engine/json";
import {
  completeSession,
  logAccess,
  logUsage,
  hashIp,
} from "@/lib/logging";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { clientCountry, clientIp, jsonError, normalizeLocale } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/generate — 3·4층: 최종 프롬프트 생성.
// DECISION: 코어 플로우가 Firestore에 하드 의존하지 않도록 클라이언트가
//   inputText/intentGuess 를 함께 echo한다(docs/02 규격 확장).
export async function POST(req: Request) {
  if (!isLlmConfigured()) {
    return jsonError("LLM이 구성되지 않았습니다.", 503, "llm_unconfigured");
  }

  let body: {
    sessionId?: unknown;
    inputText?: unknown;
    intentGuess?: unknown;
    answers?: unknown;
    locale?: unknown;
    outputLang?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400, "bad_json");
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : "";
  const inputText =
    typeof body.inputText === "string" ? body.inputText.trim() : "";
  if (!inputText) {
    return jsonError("inputText 가 비어 있습니다.", 400, "empty_input");
  }
  const intentGuess =
    typeof body.intentGuess === "string" ? body.intentGuess.trim() : "";
  const outputLang = normalizeLocale(body.outputLang ?? body.locale);

  // 답변 정규화 — id/value 문자열만 통과.
  const answers: EngineAnswer[] = Array.isArray(body.answers)
    ? body.answers
        .filter(
          (a): a is { id: unknown; value: unknown } =>
            !!a && typeof a === "object",
        )
        .map((a) => ({
          id: typeof a.id === "string" ? a.id : "",
          value: typeof a.value === "string" ? a.value.trim() : "",
        }))
        .filter((a) => a.id && a.value)
    : [];

  const ipHash = hashIp(clientIp(req));
  const sessionUser = await getSessionUser();
  const uid = sessionUser?.uid ?? null;

  try {
    // 3층-A: 설계도 → 3층-B: 합성(프롬프트 패키지). 2콜 체인.
    const { blueprint, blueprintText, usage: bpUsage } = await runBlueprint({
      inputText,
      intentGuess,
      answers,
      outputLang,
    });

    const { result, usage } = await runSynthesis({
      inputText,
      intentGuess,
      answers,
      blueprint,
      blueprintText,
      outputLang,
    });

    if (result.prompts.length === 0) {
      return jsonError("프롬프트 생성에 실패했습니다.", 502, "empty_output");
    }

    await Promise.all([
      completeSession({
        sessionId: sessionId || "unknown",
        answers,
        routedModule: result.routedModule,
        outputKind: result.outputKind,
        prompts: result.prompts,
        outputLang,
      }),
      logUsage({
        sessionId: sessionId || "unknown",
        uid,
        layer: "generate",
        model: bpUsage.model,
        inputTokens: bpUsage.inputTokens,
        outputTokens: bpUsage.outputTokens,
        latencyMs: bpUsage.latencyMs,
      }),
      logUsage({
        sessionId: sessionId || "unknown",
        uid,
        layer: "generate",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: usage.latencyMs,
      }),
      logAccess({
        uid,
        ipHash,
        country: clientCountry(req),
        path: "/api/generate",
        event: "generate",
      }),
    ]);

    return NextResponse.json({
      routedModule: result.routedModule,
      outputKind: result.outputKind,
      summary: result.summary,
      prompts: result.prompts,
      assumptions: result.assumptions,
      editHint: result.editHint,
    });
  } catch (err) {
    if (err instanceof LlmConfigError) {
      return jsonError(err.message, 503, "llm_unconfigured");
    }
    if (err instanceof JsonParseError) {
      console.error("[/api/generate] JSON 파싱 실패:", err.raw);
      return jsonError("응답 처리에 실패했습니다.", 502, "parse_error");
    }
    console.error("[/api/generate] 오류:", err);
    return jsonError("프롬프트 생성에 실패했습니다.", 500, "generate_failed");
  }
}
