import { callLLM, type LlmCallResult } from "@/lib/llm";
import { extractJson } from "./json";
import { blueprintSystemPrompt, blueprintUserPrompt } from "./prompts/blueprint";
import type {
  Blueprint,
  EngineAnswer,
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

function asTarget(v: unknown): PromptTarget {
  return VALID_TARGETS.includes(v as PromptTarget)
    ? (v as PromptTarget)
    : "text";
}

function sanitizeBlueprint(raw: Record<string, unknown>): Blueprint {
  const outputKind = raw.outputKind === "package" ? "package" : "single";

  let promptSpecs = Array.isArray(raw.promptSpecs)
    ? raw.promptSpecs
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          label: typeof s.label === "string" ? s.label : "프롬프트",
          target: asTarget(s.target),
        }))
    : [];
  if (promptSpecs.length === 0) {
    promptSpecs = [{ label: "프롬프트", target: "text" }];
  }

  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  let unitPlan: Blueprint["unitPlan"];
  if (raw.unitPlan && typeof raw.unitPlan === "object") {
    const u = raw.unitPlan as Record<string, unknown>;
    unitPlan = {
      unit: typeof u.unit === "string" ? u.unit : "단위",
      count: typeof u.count === "number" ? u.count : 0,
      perUnitChecklist: strArr(u.perUnitChecklist),
    };
  }

  return {
    outputForm:
      typeof raw.outputForm === "string" && raw.outputForm.trim()
        ? raw.outputForm.trim()
        : "generic",
    outputKind,
    unitPlan,
    promptSpecs,
    experts: strArr(raw.experts),
    successCriteria: strArr(raw.successCriteria),
    quantSpecs: strArr(raw.quantSpecs),
    antiRepetition: strArr(raw.antiRepetition),
    domainPlays: strArr(raw.domainPlays),
    requiredSlots: Array.isArray(raw.requiredSlots)
      ? raw.requiredSlots
          .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
          .map((s) => ({
            name: typeof s.name === "string" ? s.name : "",
            why: typeof s.why === "string" ? s.why : "",
            default: typeof s.default === "string" ? s.default : "",
          }))
          .filter((s) => s.name)
      : [],
  };
}

export interface RunBlueprintOutput {
  blueprint: Blueprint;
  blueprintText: string; // 합성 단계로 그대로 넘길 원문
  usage: LlmCallResult;
}

export async function runBlueprint(input: {
  inputText: string;
  intentGuess: string;
  answers: EngineAnswer[];
  outputLang: Locale;
}): Promise<RunBlueprintOutput> {
  const usage = await callLLM({
    layer: "generate",
    system: blueprintSystemPrompt(input.outputLang),
    user: blueprintUserPrompt(input.inputText, input.intentGuess, input.answers),
  });
  const raw = extractJson<Record<string, unknown>>(usage.text);
  const blueprint = sanitizeBlueprint(raw);
  return { blueprint, blueprintText: JSON.stringify(blueprint), usage };
}
