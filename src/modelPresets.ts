import { ProviderModelConfig } from './types';
import { MODEL_LIMITS, ModelLimitPreset, ModelParameterCandidate } from './modelLimits';

export type { ModelLimitPreset, ModelParameterCandidate, ModelParameterCandidateKind } from './modelLimits';

export interface ModelParameterSuggestions {
  modelId: string;
  matchedModelId: string;
  matchKind: 'exact' | 'alias' | 'snapshot' | 'fallback';
  sourceLabel: string;
  contextWindow: ModelParameterCandidate[];
  compactThresholdPercent: ModelParameterCandidate[];
  maxOutputTokens: ModelParameterCandidate[];
}

export const DEFAULT_FETCHED_CONTEXT_WINDOW = 200_000;
export const DEFAULT_COMPACT_THRESHOLD_PERCENT = 60;
export const CLAUDE_CODE_MAX_OUTPUT_TOKENS_LIMIT = 64_000;

const fallback = (value: number, label: string): ModelParameterCandidate => ({
  value,
  kind: 'fallback',
  label
});

const DEFAULT_CONTEXT = fallback(DEFAULT_FETCHED_CONTEXT_WINDOW, '通用上下文 200000');
const COMPACT_CANDIDATE = fallback(DEFAULT_COMPACT_THRESHOLD_PERCENT, '建议压缩阈值 60');
const DEFAULT_OUTPUT = fallback(32_000, '通用最大输出 32,000');

export function getModelParameterSuggestions(modelId: string): ModelParameterSuggestions {
  const lookupValues = modelLookupValues(modelId);
  const match = findPreset(lookupValues);
  if (!match) {
    return {
      modelId,
      matchedModelId: '',
      matchKind: 'fallback',
      sourceLabel: '未识别模型，提供通用候选',
      contextWindow: [DEFAULT_CONTEXT],
      compactThresholdPercent: [COMPACT_CANDIDATE],
      maxOutputTokens: [DEFAULT_OUTPUT]
    };
  }

  return {
    modelId,
    matchedModelId: match.matchedModelId,
    matchKind: match.matchKind,
    sourceLabel: match.entry.sourceLabel,
    contextWindow: match.entry.contextWindow,
    compactThresholdPercent: match.entry.compactThresholdPercent ?? [COMPACT_CANDIDATE],
    maxOutputTokens: match.entry.maxOutputTokens
  };
}

export function baseClaudeModelId(modelId: string): string {
  return modelId.trim().replace(/\[1m\]$/i, '');
}

export function claudeModelVariants(modelId: string): string[] {
  const base = baseClaudeModelId(modelId);
  return base ? [base, `${base}[1m]`] : [];
}

export function calculateModelLimits(model: ProviderModelConfig): { compactAtTokens?: number; reserved?: number } {
  if (!model.contextWindow || model.compactThresholdPercent === undefined) {
    return {};
  }
  const compactAtTokens = Math.floor(model.contextWindow * model.compactThresholdPercent / 100);
  return {
    compactAtTokens,
    reserved: model.contextWindow - compactAtTokens
  };
}

export function claudeCodeMaxOutputTokens(value: number | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  return Math.min(value, CLAUDE_CODE_MAX_OUTPUT_TOKENS_LIMIT);
}

function modelLookupValues(modelId: string): string[] {
  const normalized = baseClaudeModelId(modelId).toLocaleLowerCase();
  const withoutPrefix = normalized.includes('/') ? normalized.slice(normalized.lastIndexOf('/') + 1) : normalized;
  return Array.from(new Set([normalized, withoutPrefix].filter(Boolean)));
}

function findPreset(lookupValues: string[]): { entry: ModelLimitPreset; matchedModelId: string; matchKind: 'exact' | 'alias' | 'snapshot' } | undefined {
  for (const lookup of lookupValues) {
    for (const entry of MODEL_LIMITS) {
      const exact = entry.ids.find((id) => id.toLocaleLowerCase() === lookup);
      if (exact) {
        return { entry, matchedModelId: exact, matchKind: 'exact' };
      }
    }
  }
  for (const lookup of lookupValues) {
    for (const entry of MODEL_LIMITS) {
      const alias = entry.aliases?.find((id) => id.toLocaleLowerCase() === lookup);
      if (alias) {
        return { entry, matchedModelId: alias, matchKind: 'alias' };
      }
    }
  }
  for (const lookup of lookupValues) {
    for (const entry of MODEL_LIMITS) {
      const snapshot = entry.ids.find((id) => isDatedSnapshotOf(lookup, id.toLocaleLowerCase()));
      if (snapshot) {
        return { entry, matchedModelId: snapshot, matchKind: 'snapshot' };
      }
    }
  }
  return undefined;
}

function isDatedSnapshotOf(lookup: string, base: string): boolean {
  if (!lookup.startsWith(`${base}-`)) {
    return false;
  }
  const suffix = lookup.slice(base.length + 1);
  return /^\d{4}(?:-?\d{2}){0,2}$/.test(suffix);
}
