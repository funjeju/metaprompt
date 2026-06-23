import { NextResponse } from "next/server";
import { logAccess, hashIp } from "@/lib/logging";
import { clientCountry, clientIp } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/log — 클라이언트 이벤트(page_view 등) 적재 (docs/01 1.3).
// 민감정보를 받지 않는다. event/path 만.
const ALLOWED_EVENTS = new Set(["login", "page_view", "generate"]);

export async function POST(req: Request) {
  let body: { event?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 256) : "/";

  await logAccess({
    uid: null,
    ipHash: hashIp(clientIp(req)),
    country: clientCountry(req),
    path,
    event: event as "login" | "page_view" | "generate",
  });

  return NextResponse.json({ ok: true });
}
