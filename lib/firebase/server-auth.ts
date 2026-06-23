import { cookies } from "next/headers";
import { getAdminAuth } from "./admin";

// ════════════════════════════════════════════════════════════════
// 서버 측 인증 — 세션 쿠키 검증 (docs/03 3.3).
// 어드민 판별은 Firebase Custom Claims(admin==true) 로만 한다.
// firebase-admin 은 Node 런타임 전용 → 미들웨어(Edge)가 아니라
// 서버 컴포넌트/라우트에서 사용한다.
// ════════════════════════════════════════════════════════════════

export const SESSION_COOKIE = "session";

export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  admin: boolean;
}

/** 현재 세션 사용자. 미로그인/미설정/검증실패 시 null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
      admin: decoded.admin === true,
    };
  } catch {
    return null;
  }
}
