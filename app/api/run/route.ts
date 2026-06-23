import { NextResponse } from "next/server";
import { runPrompt, runMaster } from "@/lib/engine";
import { isLlmConfigured, LlmConfigError } from "@/lib/llm";
import { logUsage, logAccess, hashIp } from "@/lib/logging";
import { checkGuestRateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { clientCountry, clientIp, jsonError, normalizeLocale } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60; // 마스터 실행은 길어질 수 있음

// POST /api/run — 프롬프트를 실제 실행 (mode=single 평문 / mode=master 마스터 실행→결과+이미지프롬프트).
const MAX_PROMPT_LEN = 16000;

export async function POST(req: Request) {
  if (!isLlmConfigured()) {
    return jsonError("LLM이 구성되지 않았습니다.", 503, "llm_unconfigured");
  }

  let body: {
    prompt?: unknown;
    mode?: unknown;
    outputLang?: unknown;
    locale?: unknown;
    sessionId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400, "bad_json");
  }

  const prompt =
    typeof body.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT_LEN) : "";
  if (!prompt) {
    return jsonError("prompt 가 비어 있습니다.", 400, "empty_prompt");
  }
  const mode = body.mode === "master" ? "master" : "single";
  const outputLang = normalizeLocale(body.outputLang ?? body.locale);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  // 로그인 사용자는 rate limit 면제, 게스트만 IP 기준.
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
    const { result, usage, imagePrompts } =
      mode === "master"
        ? await runMaster(prompt, outputLang)
        : { ...(await runPrompt(prompt, outputLang)), imagePrompts: undefined };

    if (!result) {
      return jsonError("결과물 생성에 실패했습니다.", 502, "empty_output");
    }

    await Promise.all([
      logUsage({
        sessionId: sessionId || "unknown",
        uid,
        layer: "run",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: usage.latencyMs,
      }),
      logAccess({
        uid,
        ipHash,
        country: clientCountry(req),
        path: "/api/run",
        event: "generate",
      }),
    ]);

    return NextResponse.json(
      mode === "master" ? { result, imagePrompts: imagePrompts ?? [] } : { result },
    );
  } catch (err) {
    if (err instanceof LlmConfigError) {
      return jsonError(err.message, 503, "llm_unconfigured");
    }
    console.error("[/api/run] 오류:", err);
    return jsonError("결과물 생성에 실패했습니다.", 500, "run_failed");
  }
}
