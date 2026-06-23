import createNextIntlPlugin from "next-intl/plugin";

// DECISION: next-intl을 URL [locale] 세그먼트 없이 쿠키 기반으로 사용 (docs/04 4.4 미결정 → MVP 단순화).
// i18n/request.ts 에서 쿠키로 locale을 읽는다.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
