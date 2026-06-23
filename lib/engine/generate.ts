import { callLLM, type LlmCallResult } from "@/lib/llm";
import { extractJson } from "./json";
import {
  synthesisSystemPrompt,
  synthesisUserPrompt,
} from "./prompts/generate";
import type {
  Blueprint,
  EngineAnswer,
  GenerateResult,
  Locale,
  PromptTarget,
} from "./types";

const VALID_TARGETS: PromptTarget[] = [
  "text",
  "image",
  "audio",
  "video",
  "code",
  "other",
];
const asTarget = (v: unknown): PromptTarget =>
  VALID_TARGETS.includes(v as PromptTarget) ? (v as PromptTarget) : "text";

interface RawSynthesis {
  routedModule?: unknown;
  outputKind?: unknown;
  primaryTarget?: unknown;
  summary?: unknown;
  masterPrompt?: unknown;
  assumptions?: unknown;
  editHint?: unknown;
}

export interface RunSynthesisInput {
  inputText: string;
  intentGuess: string;
  answers: EngineAnswer[];
  blueprint: Blueprint;
  blueprintText: string;
  /** 생성 프롬프트 언어 — UI 언어와 별개 (docs/04 4.4). */
  outputLang: Locale;
}

export interface RunSynthesisOutput {
  result: GenerateResult;
  usage: LlmCallResult;
}

export async function runSynthesis(
  input: RunSynthesisInput,
): Promise<RunSynthesisOutput> {
  const { inputText, intentGuess, answers, blueprint, blueprintText, outputLang } =
    input;

  const usage = await callLLM({
    layer: "generate",
    system: synthesisSystemPrompt(outputLang),
    user: synthesisUserPrompt(inputText, intentGuess, answers, blueprintText),
  });

  const raw = extractJson<RawSynthesis>(usage.text);

  const outputKind =
    raw.outputKind === "master" || blueprint.outputKind === "master"
      ? "master"
      : "single";

  const result: GenerateResult = {
    routedModule:
      typeof raw.routedModule === "string" && raw.routedModule.trim()
        ? raw.routedModule.trim()
        : blueprint.outputForm,
    outputKind,
    primaryTarget:
      outputKind === "master" ? "text" : asTarget(raw.primaryTarget ?? blueprint.primaryTarget),
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    masterPrompt:
      typeof raw.masterPrompt === "string" ? raw.masterPrompt.trim() : "",
    assumptions: Array.isArray(raw.assumptions)
      ? raw.assumptions.filter((a): a is string => typeof a === "string")
      : [],
    editHint: typeof raw.editHint === "string" ? raw.editHint.trim() : "",
  };

  return { result, usage };
}
