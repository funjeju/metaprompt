import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// ════════════════════════════════════════════════════════════════
// Firebase Admin SDK — 서버 전용. sessions/usage_logs/access_logs 는
// 클라이언트 직접 write 금지, 전부 이 경로로만 적재한다 (docs/03 3.2).
// env 미설정 시에도 빌드/실행이 깨지지 않도록 null 을 반환한다(로깅은 best-effort).
// ════════════════════════════════════════════════════════════════

let cachedDb: Firestore | null = null;
let initTried = false;

function readCredentials() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // 사설키는 env에서 \n 이스케이프로 들어오는 경우가 많아 복원한다.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App | null {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  const creds = readCredentials();
  if (!creds) return null;
  return initializeApp({ credential: cert(creds) });
}

/** Firestore 인스턴스. env 미설정이면 null (호출부는 null 가드 필수). */
export function getAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  if (initTried) return cachedDb;
  initTried = true;
  const app = getAdminApp();
  if (!app) return null;
  cachedDb = getFirestore(app);
  return cachedDb;
}

/** Admin Auth 인스턴스. env 미설정이면 null. */
export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
}

export function isFirebaseAdminConfigured(): boolean {
  return readCredentials() !== null;
}
