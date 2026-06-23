import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

// PATCH /api/me — 본인 환경설정(locale/theme)만 갱신.
// 권한·과금 필드(role, planTier)는 절대 받지 않는다 (docs/03 3.2).
const ALLOWED_THEME = new Set(["light", "dark", "system"]);
const ALLOWED_LOCALE = new Set(["ko", "en"]);

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401, "unauthorized");

  const db = getAdminDb();
  if (!db) return jsonError("DB가 구성되지 않았습니다.", 503, "db_unconfigured");

  let body: { locale?: unknown; theme?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다.", 400, "bad_json");
  }

  const update: Record<string, string> = {};
  if (typeof body.locale === "string" && ALLOWED_LOCALE.has(body.locale)) {
    update.locale = body.locale;
  }
  if (typeof body.theme === "string" && ALLOWED_THEME.has(body.theme)) {
    update.theme = body.theme;
  }
  if (Object.keys(update).length === 0) {
    return jsonError("변경할 항목이 없습니다.", 400, "nothing_to_update");
  }

  await db.collection("users").doc(user.uid).set(update, { merge: true });
  return NextResponse.json({ ok: true, updated: update });
}
