import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/posts — 생성 결과를 피드에 게시(저장). 로그인 필요.
// DECISION: visibility = private(저장만) | public_full(전체공개) | public_partial(티저만).
//   이미지는 클라이언트가 축소한 썸네일(data URL)을 보낸다(Storage 미사용, MVP).
const VIS = new Set(["private", "public_full", "public_partial"]);
const MAX_PROMPT = 12000;
const MAX_THUMBS = 8;
const MAX_THUMB_LEN = 120_000; // data URL 길이 상한(개당 ~90KB)

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401, "unauthorized");

  const db = getAdminDb();
  if (!db) return jsonError("DB가 구성되지 않았습니다.", 503, "db_unconfigured");

  let body: {
    masterPrompt?: unknown;
    summary?: unknown;
    routedModule?: unknown;
    outputKind?: unknown;
    visibility?: unknown;
    thumbnails?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다.", 400, "bad_json");
  }

  const masterPrompt =
    typeof body.masterPrompt === "string"
      ? body.masterPrompt.trim().slice(0, MAX_PROMPT)
      : "";
  if (!masterPrompt) return jsonError("내용이 비어 있습니다.", 400, "empty");

  const visibility =
    typeof body.visibility === "string" && VIS.has(body.visibility)
      ? body.visibility
      : "public_full";

  const thumbnails = Array.isArray(body.thumbnails)
    ? body.thumbnails
        .filter(
          (t): t is string =>
            typeof t === "string" &&
            t.startsWith("data:image") &&
            t.length <= MAX_THUMB_LEN,
        )
        .slice(0, MAX_THUMBS)
    : [];

  const ref = await db.collection("posts").add({
    uid: user.uid,
    authorName: user.name ?? null,
    authorPhoto: user.picture ?? null,
    masterPrompt,
    summary: typeof body.summary === "string" ? body.summary.slice(0, 500) : "",
    routedModule:
      typeof body.routedModule === "string"
        ? body.routedModule.slice(0, 60)
        : "generic",
    outputKind: body.outputKind === "single" ? "single" : "master",
    visibility,
    thumbnails,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
