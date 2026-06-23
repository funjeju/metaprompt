import { callLLM, type LlmCallResult } from "@/lib/llm";
import { extractJson } from "./json";
import { generateSystemPrompt, generateUserPrompt } from "./prompts/generate";
import type { EngineAnswer, GenerateResult, Locale } from "./types";

interface RawGenerate {
  routedModule?: unknown;
  finalPrompt?: unknown;
  assumptions?: unknown;
  editHint?: unknown;
}

export interface RunGenerateInput {
  inputText: string;
  intentGuess: string;
  answers: EngineAnswer[];
  /** 생성 프롬프트 언어 — UI 언어와 별개 (docs/02 2.4, docs/04 4.4). */
  outputLang: Locale;
}

export interface RunGenerateOutput {
  result: GenerateResult;
  usage: LlmCallResult;
}

export async function runGenerate(
  input: RunGenerateInput,
): Promise<RunGenerateOutput> {
  const { inputText, intentGuess, answers, outputLang } = input;

  const usage = await callLLM({
    layer: "generate",
    system: generateSystemPrompt(outputLang),
    user: generateUserPrompt(inputText, intentGuess, answers),
  });

  const raw = extractJson<RawGenerate>(usage.text);

  const result: GenerateResult = {
    routedModule:
      typeof raw.routedModule === "string" && raw.routedModule.trim()
        ? raw.routedModule.trim()
        : "generic",
    finalPrompt:
      typeof raw.finalPrompt === "string" ? raw.finalPrompt.trim() : "",
    assumptions: Array.isArray(raw.assumptions)
      ? raw.assumptions.filter((a): a is string => typeof a === "string")
      : [],
    editHint: typeof raw.editHint === "string" ? raw.editHint.trim() : "",
  };

  return { result, usage };
}
