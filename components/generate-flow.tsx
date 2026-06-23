"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

// ── API 응답 타입 (docs/02 2.4) ──────────────────────────────────
interface Question {
  id: string;
  text: string;
  options: string[];
}
interface IntentResponse {
  sessionId: string;
  intentGuess: string;
  needsQuestions: boolean;
  questions: Question[];
}
interface GenerateResponse {
  routedModule: string;
  finalPrompt: string;
  assumptions: string[];
  editHint: string;
}

type Phase = "intent" | "questions" | "generating" | "result" | "error";

const OTHER_PREFIX = "__other__"; // "기타: 직접 입력" 내부 마커

export function GenerateFlow() {
  const t = useTranslations("flow");
  const tr = useTranslations("result");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const inputText = (params.get("q") ?? "").trim();

  const [phase, setPhase] = useState<Phase>("intent");
  const [errorMsg, setErrorMsg] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  // 답변: questionId -> 선택값. OTHER_PREFIX + 텍스트 면 직접입력.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [outputLang, setOutputLang] = useState(locale);
  const [output, setOutput] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const startedRef = useRef(false);

  // 답변을 API 페이로드로 변환.
  const buildAnswers = useCallback(() => {
    if (!intent) return [];
    return intent.questions
      .map((q) => {
        const raw = answers[q.id];
        if (!raw) return null;
        const value = raw.startsWith(OTHER_PREFIX)
          ? (otherText[q.id] ?? "").trim()
          : raw;
        if (!value) return null;
        return { id: q.id, value };
      })
      .filter((a): a is { id: string; value: string } => a !== null);
  }, [intent, answers, otherText]);

  const runGenerate = useCallback(
    async (intentData: IntentResponse, lang: string) => {
      setPhase("generating");
      setErrorMsg("");
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: intentData.sessionId,
            inputText,
            intentGuess: intentData.intentGuess,
            answers: buildAnswers(),
            locale,
            outputLang: lang,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || te("generic"));
        }
        const data: GenerateResponse = await res.json();
        setOutput(data);
        setPhase("result");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : te("generic"));
        setPhase("error");
      }
    },
    [inputText, locale, te, buildAnswers],
  );

  // 마운트 시 1층 호출 (StrictMode 이중호출 가드).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!inputText) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputText, locale }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.code === "rate_limited") throw new Error(te("rateLimited"));
          throw new Error(data.error || te("generic"));
        }
        const data: IntentResponse = await res.json();
        setIntent(data);
        if (!data.needsQuestions || data.questions.length === 0) {
          await runGenerate(data, locale);
        } else {
          setPhase("questions");
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : te("generic"));
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allAnswered =
    intent?.questions.every((q) => {
      const raw = answers[q.id];
      if (!raw) return false;
      if (raw.startsWith(OTHER_PREFIX)) return (otherText[q.id] ?? "").trim();
      return true;
    }) ?? false;

  async function copyPrompt() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard 거부 시 무시 */
    }
  }

  // ── 렌더 ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24">
      {/* 원본 입력 + 의도 배너 */}
      {intent && phase !== "error" && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {t("intentBanner")}
          </p>
          <p className="mt-1.5 text-base font-medium text-ink">
            {intent.intentGuess || inputText}
          </p>
          {phase === "questions" && (
            <p className="mt-1 text-sm text-muted">{t("intentConfirm")}</p>
          )}
        </div>
      )}

      {/* 로딩 */}
      {(phase === "intent" || phase === "generating") && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Spinner />
          <p className="text-sm text-muted">
            {phase === "intent" ? t("analyzing") : t("generating")}
          </p>
        </div>
      )}

      {/* 객관식 질문 */}
      {phase === "questions" && intent && (
        <div className="flex flex-col gap-5">
          {intent.questions.map((q, i) => (
            <fieldset
              key={q.id}
              className="rounded-lg border border-border bg-surface p-5 shadow-card"
            >
              <legend className="px-1 text-xs font-medium text-faint">
                {t("questionStep", {
                  current: i + 1,
                  total: intent.questions.length,
                })}
              </legend>
              <p className="text-base font-medium text-ink">{q.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt, oi) => {
                  const isOther =
                    opt.includes("기타") || opt.toLowerCase().includes("other");
                  const optValue = isOther
                    ? `${OTHER_PREFIX}${oi}`
                    : opt;
                  const selected = answers[q.id] === optValue;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: optValue }))
                      }
                      className={`rounded-pill border px-4 py-2 text-sm transition ${
                        selected
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-surface text-ink hover:border-accent"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {/* 기타 선택 시 직접입력 */}
              {answers[q.id]?.startsWith(OTHER_PREFIX) && (
                <input
                  type="text"
                  value={otherText[q.id] ?? ""}
                  onChange={(e) =>
                    setOtherText((o) => ({ ...o, [q.id]: e.target.value }))
                  }
                  placeholder={t("otherPlaceholder")}
                  className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                />
              )}
            </fieldset>
          ))}

          <div className="flex items-center justify-between gap-3 pt-1">
            <OutputLangSelect
              value={outputLang}
              onChange={setOutputLang}
              label={t("outputLang")}
            />
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => intent && runGenerate(intent, outputLang)}
              className="rounded-pill bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {t("generate")}
            </button>
          </div>
        </div>
      )}

      {/* 결과 */}
      {phase === "result" && output && (
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">{tr("heading")}</h2>
              <button
                type="button"
                onClick={copyPrompt}
                className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                {copied ? tr("copied") : tr("copy")}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-bg p-4 text-sm leading-relaxed text-ink">
              {output.finalPrompt}
            </pre>
          </div>

          {output.assumptions.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-warning">
                {tr("assumptions")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {output.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {output.editHint && (
            <p className="text-sm text-muted">
              💡 <span className="font-medium text-ink">{tr("editHint")}:</span>{" "}
              {output.editHint}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-pill border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent"
            >
              {t("restart")}
            </button>
            {intent && intent.questions.length > 0 && (
              <button
                type="button"
                onClick={() => setPhase("questions")}
                className="rounded-pill border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent"
              >
                {t("back")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 오류 */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-sm text-danger">{errorMsg || te("generic")}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("restart")}
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent"
      aria-label="loading"
    />
  );
}

function OutputLangSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
