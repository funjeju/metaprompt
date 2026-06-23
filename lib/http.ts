import { NextResponse } from "next/server";
import type { Locale } from "@/lib/engine/types";

// 라우트 공통 유틸.

export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

export function clientCountry(req: Request): string | null {
  // Vercel 은 x-vercel-ip-country 를 주입한다.
  return req.headers.get("x-vercel-ip-country");
}

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "ko"; // 기본 ko
}

export function jsonError(
  message: string,
  status: number,
  code?: string,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}
