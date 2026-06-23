import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/server-auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

// POST /api/auth/session — ID 토큰을 검증해 httpOnly 세션 쿠키를 만든다.
// 동시에 users/{uid} 문서를 upsert (role 은 서버에서만, 기존값 보존).
export async function POST(req: Request) {
  const auth = getAdminAuth();
  if (!auth) {
    return jsonError("인증이 구성되지 않았습니다.", 503, "auth_unconfigured");
  }

  let idToken: string;
  try {
    const body = await req.json();
    idToken = typeof body.idToken === "string" ? body.idToken : "";
  } catch {
    return jsonError("잘못된 요청입니다.", 400, "bad_json");
  }
  if (!idToken) return jsonError("idToken 이 없습니다.", 400, "no_token");

  try {
    const decoded = await auth.verifyIdToken(idToken);

    // users 문서 upsert. role 은 클라이언트가 못 바꾼다 — 신규일 때만 "user".
    const db = getAdminDb();
    if (db) {
      const ref = db.collection("users").doc(decoded.uid);
      const snap = await ref.get();
      const base = {
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        photoURL: decoded.picture ?? null,
        lastLoginAt: FieldValue.serverTimestamp(),
      };
      if (snap.exists) {
        await ref.set(base, { merge: true });
      } else {
        await ref.set({
          ...base,
          role: "user",
          planTier: "free",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      maxAge: FIVE_DAYS_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[/api/auth/session] 검증 실패:", err);
    return jsonError("인증에 실패했습니다.", 401, "auth_failed");
  }
}

// DELETE /api/auth/session — 로그아웃(쿠키 제거).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
