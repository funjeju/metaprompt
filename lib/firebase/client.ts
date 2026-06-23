import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// ════════════════════════════════════════════════════════════════
// Firebase 클라이언트 SDK — Auth/Analytics 용 (NEXT_PUBLIC 키만 사용).
// YOU MUST NOT: LLM 키 등 서버 비밀을 여기 두지 마라 (CLAUDE.md 절대규칙 1).
// MVP 현 단계에서는 초기화 골격만 둔다(Auth 화면은 다음 단계).
// env 미설정 시 null 을 반환해 빌드/렌더가 깨지지 않게 한다.
// ════════════════════════════════════════════════════════════════

function readConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

let cachedApp: FirebaseApp | null = null;

export function getClientApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const config = readConfig();
  if (!config) return null;
  cachedApp = initializeApp(config);
  return cachedApp;
}

/** 클라이언트 Auth 인스턴스. env 미설정이면 null. */
export function getClientAuth(): Auth | null {
  const app = getClientApp();
  if (!app) return null;
  return getAuth(app);
}

export function isFirebaseClientConfigured(): boolean {
  return readConfig() !== null;
}
