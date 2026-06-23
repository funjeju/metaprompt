import { NextResponse } from "next/server";
import { generateImage, isLlmConfigured, LlmConfigError } from "@/lib/llm";
import { logAccess, hashIp } from "@/lib/logging";
import { checkGuestRateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { clientCountry, clientIp, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60; // 이미지 생성은 길어질 수 있음

// POST /api/render — target=image 프롬프트를 이미지 모델로 렌더해 결과 이미지를 반환.
const MAX_PROMPT_LEN = 4000;
const ALLOWED_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);

export async function POST(req: Request) {
  if (!isLlmConfigured()) {
    return jsonError("LLM이 구성되지 않았습니다.", 503, "llm_unconfigured");
  }

  let body: { prompt?: unknown; size?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400, "bad_json");
  }

  const prompt =
    typeof body.prompt === "string"
      ? body.prompt.trim().slice(0, MAX_PROMPT_LEN)
      : "";
  if (!prompt) return jsonError("prompt 가 비어 있습니다.", 400, "empty_prompt");
  const size =
    typeof body.size === "string" && ALLOWED_SIZES.has(body.size)
      ? (body.size as "1024x1024" | "1024x1536" | "1536x1024" | "auto")
      : "1024x1024";

  // 로그인 사용자는 면제, 게스트만 제한(이미지는 더 비싸므로 동일 버킷 차감).
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
    const { b64 } = await generateImage(prompt, { size });
    if (!b64) {
      return jsonError("이미지 생성에 실패했습니다.", 502, "empty_image");
    }

    await logAccess({
      uid,
      ipHash,
      country: clientCountry(req),
      path: "/api/render",
      event: "generate",
    });

    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    if (err instanceof LlmConfigError) {
      return jsonError(err.message, 503, "llm_unconfigured");
    }
    console.error("[/api/render] 오류:", err);
    return jsonError("이미지 생성에 실패했습니다.", 500, "render_failed");
  }
}
