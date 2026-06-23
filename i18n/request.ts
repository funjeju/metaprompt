import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// 지원 언어. DECISION: 기본 ko, 2차 en (docs/04 4.4).
export const locales = ["ko", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ko";

export const LOCALE_COOKIE = "NEXT_LOCALE";

// DECISION: URL [locale] 세그먼트 없이 쿠키 기반 locale (MVP 단순화).
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale: AppLocale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as AppLocale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
