"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

// ── API 응답 타입 (docs/02 2.4) ──────────────────────────────────
interface Question {
  id: string;
  text: string;
  options: string[];
  multiSelect?: boolean;
}
interface IntentResponse {
  sessionId: string;
  intentGuess: string;
  needsQuestions: boolean;
  questions: Question[];
}
type PromptTarget = "text" | "image" | "audio" | "video" | "code" | "other";
interface PromptItem {
  id: string;
  label: string;
  target: PromptTarget;
  prompt: string;
}
interface GenerateResponse {
  routedModule: string;
  outputKind: "single" | "package";
  summary: string;
  prompts: PromptItem[];
  assumptions: string[];
  editHint: string;
}

type Phase = "intent" | "questions" | "generating" | "result" | "error";

const OTHER = "__other__"; // "기타: 직접 입력" 내부 마커

function isOtherOption(opt: string): boolean {
  return opt.includes("기타") || opt.toLowerCase().includes("other");
}

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
  // 답변: questionId -> 선택된 보기들(복수선택 지원). "기타"는 OTHER 마커로 저장.
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [outputLang, setOutputLang] = useState(locale);
  const [output, setOutput] = useState<GenerateResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 프롬프트 항목별 실행/렌더 상태 (id -> 값)
  const [textResults, setTextResults] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Before/After 비교 (대표 텍스트 프롬프트 기준)
  const [running, setRunning] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [beforeResult, setBeforeResult] = useState<string | null>(null);
  const [afterResult, setAfterResult] = useState<string | null>(null);

  const startedRef = useRef(false);

  // 텍스트 프롬프트 1건 실행 (/api/run).
  const runOne = useCallback(
    async (prompt: string): Promise<string> => {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, outputLang, sessionId: intent?.sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || te("generic"));
      }
      const data: { result: string } = await res.json();
      return data.result;
    },
    [outputLang, intent, te],
  );

  // 항목별 텍스트 실행.
  const runItem = useCallback(
    async (item: PromptItem) => {
      setBusy((b) => ({ ...b, [item.id]: true }));
      try {
        const r = await runOne(item.prompt);
        setTextResults((t) => ({ ...t, [item.id]: r }));
      } catch (err) {
        setTextResults((t) => ({
          ...t,
          [item.id]: err instanceof Error ? err.message : te("generic"),
        }));
      } finally {
        setBusy((b) => ({ ...b, [item.id]: false }));
      }
    },
    [runOne, te],
  );

  // 항목별 이미지 렌더 (/api/render).
  const renderItem = useCallback(
    async (item: PromptItem) => {
      setBusy((b) => ({ ...b, [item.id]: true }));
      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: item.prompt, sessionId: intent?.sessionId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || te("generic"));
        }
        const data: { image: string } = await res.json();
        setImages((im) => ({ ...im, [item.id]: data.image }));
      } catch (err) {
        setTextResults((t) => ({
          ...t,
          [item.id]: err instanceof Error ? err.message : te("generic"),
        }));
      } finally {
        setBusy((b) => ({ ...b, [item.id]: false }));
      }
    },
    [intent, te],
  );

  // "Before/After 비교" — 원본 입력 그대로 vs 대표 텍스트 프롬프트.
  const primaryTextPrompt =
    output?.prompts.find((p) => p.target === "text")?.prompt ??
    output?.prompts[0]?.prompt ??
    "";
  const runCompare = useCallback(async () => {
    if (!primaryTextPrompt) return;
    setShowCompare(true);
    setRunning(true);
    setBeforeResult(null);
    setAfterResult(null);
    try {
      const [before, after] = await Promise.all([
        runOne(inputText),
        runOne(primaryTextPrompt),
      ]);
      setBeforeResult(before);
      setAfterResult(after);
    } catch (err) {
      const msg = err instanceof Error ? err.message : te("generic");
      setBeforeResult((b) => b ?? msg);
      setAfterResult((a) => a ?? msg);
    } finally {
      setRunning(false);
    }
  }, [primaryTextPrompt, runOne, inputText, te]);

  // 보기 선택 토글. 단일선택이면 교체, 복수선택이면 추가/제거.
  const toggleOption = useCallback(
    (q: Question, optValue: string) => {
      setAnswers((prev) => {
        const cur = prev[q.id] ?? [];
        if (q.multiSelect) {
          const next = cur.includes(optValue)
            ? cur.filter((v) => v !== optValue)
            : [...cur, optValue];
          return { ...prev, [q.id]: next };
        }
        // 단일선택: 같은 걸 다시 누르면 해제, 아니면 교체
        return { ...prev, [q.id]: cur.includes(optValue) ? [] : [optValue] };
      });
    },
    [],
  );

  // 답변을 API 페이로드로 변환. 복수선택은 ", "로 합치고, OTHER는 직접입력으로 치환.
  const buildAnswers = useCallback(() => {
    if (!intent) return [];
    return intent.questions
      .map((q) => {
        const sel = answers[q.id] ?? [];
        const values = sel
          .map((v) => (v === OTHER ? (otherText[q.id] ?? "").trim() : v))
          .filter((v) => v !== "");
        if (values.length === 0) return null;
        return { id: q.id, value: values.join(", ") };
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
      const sel = answers[q.id] ?? [];
      if (sel.length === 0) return false;
      // "기타"만 골랐다면 직접입력이 채워져야 한다.
      if (sel.includes(OTHER) && !(otherText[q.id] ?? "").trim()) return false;
      return true;
    }) ?? false;

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
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
                {q.multiSelect && (
                  <span className="ml-2 text-accent">· {t("multiSelectHint")}</span>
                )}
              </legend>
              <p className="text-base font-medium text-ink">{q.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt, oi) => {
                  const optValue = isOtherOption(opt) ? OTHER : opt;
                  const selected = (answers[q.id] ?? []).includes(optValue);
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => toggleOption(q, optValue)}
                      className={`rounded-pill border px-4 py-2 text-sm transition ${
                        selected
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-surface text-ink hover:border-accent"
                      }`}
                    >
                      {q.multiSelect && selected ? "✓ " : ""}
                      {opt}
                    </button>
                  );
                })}
              </div>
              {/* 기타 선택 시 직접입력 */}
              {(answers[q.id] ?? []).includes(OTHER) && (
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

      {/* 결과 — 프롬프트 패키지 */}
      {phase === "result" && output && (
        <div className="flex flex-col gap-5">
          {/* 헤더 + 요약 */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{tr("heading")}</h2>
              <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                {output.routedModule}
              </span>
              {output.outputKind === "package" && (
                <span className="rounded-pill bg-accent-tint px-2.5 py-0.5 text-xs text-accent">
                  {tr("packageBadge", { count: output.prompts.length })}
                </span>
              )}
            </div>
            {output.summary && (
              <p className="mt-1.5 text-sm text-muted">{output.summary}</p>
            )}
          </div>

          {/* 프롬프트 항목들 */}
          {output.prompts.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-surface p-5 shadow-card"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{item.label}</span>
                  <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {item.target}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(item.prompt, item.id)}
                  className="shrink-0 rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  {copiedId === item.id ? tr("copied") : tr("copy")}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-bg p-4 text-sm leading-relaxed text-ink">
                {item.prompt}
              </pre>

              {/* 항목별 실행 / 렌더 */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.target === "image" ? (
                  <button
                    type="button"
                    disabled={busy[item.id]}
                    onClick={() => renderItem(item)}
                    className="rounded-pill bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-50"
                  >
                    🖼 {tr("renderImage")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy[item.id]}
                    onClick={() => runItem(item)}
                    className="rounded-pill bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-50"
                  >
                    ✨ {tr("runItem")}
                  </button>
                )}
                {busy[item.id] && <Spinner />}
              </div>

              {images[item.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[item.id]}
                  alt={item.label}
                  className="mt-3 w-full max-w-sm rounded-md border border-border"
                />
              )}
              {textResults[item.id] && (
                <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-bg p-4 text-sm leading-relaxed text-ink">
                  {textResults[item.id]}
                </pre>
              )}
            </div>
          ))}

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

          {/* Before/After 비교 (대표 텍스트 프롬프트, docs/04 4.2 step5) */}
          {primaryTextPrompt && (
            <button
              type="button"
              disabled={running}
              onClick={runCompare}
              className="self-start rounded-pill border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent disabled:opacity-50"
            >
              {tr("compare")}
            </button>
          )}
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner />
              {tr("running")}
            </div>
          )}
          {showCompare && !running && (beforeResult || afterResult) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                  {tr("beforeLabel")}
                </p>
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
                  {beforeResult}
                </pre>
              </div>
              <div className="rounded-lg border border-accent bg-surface p-5 shadow-card">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">
                  {tr("afterLabel")}
                </p>
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                  {afterResult}
                </pre>
              </div>
            </div>
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
