"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// 범용 복사 버튼(피드 등). 클립보드에 text 복사.
export function CopyButton({ text }: { text: string }) {
  const tr = useTranslations("result");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* 무시 */
        }
      }}
      className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
    >
      {copied ? tr("copied") : tr("copy")}
    </button>
  );
}
