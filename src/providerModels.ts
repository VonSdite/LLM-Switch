import { DEFAULT_COMPACT_THRESHOLD_PERCENT, DEFAULT_FETCHED_CONTEXT_WINDOW, baseClaudeModelId, getModelParameterSuggestions } from './modelPresets';
import { ProviderConfig, ProviderModelConfig } from './types';

const CONTEXT_WINDOW_KEYS = ['contextWindow', 'context_length', 'context_window', 'maxContextWindow', 'max_context_window', 'max_context_length', 'max_model_len'];
const MAX_OUTPUT_TOKEN_KEYS = ['maxOutputTokens', 'max_output_tokens', 'max_completion_tokens', 'output_token_limit'];
const NESTED_CONTEXT_WINDOW_KEYS = [...CONTEXT_WINDOW_KEYS, 'context'];
const NESTED_MAX_OUTPUT_TOKEN_KEYS = [...MAX_OUTPUT_TOKEN_KEYS, 'output'];

export function findProviderModel(provider: ProviderConfig, modelId: string): ProviderModelConfig | undefined {
  const baseId = baseClaudeModelId(modelId);
  return provider.models.find((model) => baseClaudeModelId(model.id) === baseId)
    ?? provider.models.find((model) => baseClaudeModelId(model.id).toLocaleLowerCase() === baseId.toLocaleLowerCase());
}

export function normalizeProviderModels(value: unknown, strict = false): ProviderModelConfig[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]+/)
      : [];
  const models: ProviderModelConfig[] = [];
  const seen = new Set<string>();

  for (const item of rawItems) {
    const raw = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : undefined;
    const id = (raw ? stringValue(raw.id) : stringValue(item)).trim();
    if (!id) {
      continue;
    }
    if (seen.has(id)) {
      if (strict) {
        throw new Error(`模型 ID 不能重复：${id}`);
      }
      continue;
    }
    seen.add(id);

    const contextWindow = raw ? optionalPositiveInteger(raw.contextWindow, `${id} 的上下文窗口`, strict) : undefined;
    let compactThresholdPercent = raw
      ? optionalPositiveInteger(raw.compactThresholdPercent, `${id} 的压缩阈值`, strict)
      : undefined;
    let maxOutputTokens = raw ? optionalPositiveInteger(raw.maxOutputTokens, `${id} 的最大输出`, strict) : undefined;
    if (compactThresholdPercent !== undefined && compactThresholdPercent > 99) {
      if (strict) {
        throw new Error(`${id} 的压缩阈值必须是 1-99 的整数百分比。`);
      }
      compactThresholdPercent = undefined;
    }
    if (contextWindow && maxOutputTokens && maxOutputTokens > contextWindow) {
      if (strict) {
        throw new Error(`${id} 的最大输出不能大于上下文窗口。`);
      }
      maxOutputTokens = undefined;
    }
    models.push({
      id,
      contextWindow,
      compactThresholdPercent,
      maxOutputTokens
    });
  }

  return models.sort((left, right) => left.id.localeCompare(right.id));
}

export function mergeFetchedModels(existing: ProviderModelConfig[], fetchedIds: string[]): ProviderModelConfig[] {
  const byId = new Map(existing.map((model) => [model.id, model]));
  for (const id of fetchedIds.map((value) => value.trim()).filter(Boolean)) {
    if (!byId.has(id)) {
      byId.set(id, defaultFetchedModelConfig(id));
    }
  }
  return normalizeProviderModels(Array.from(byId.values()));
}

export function extractFetchedModelConfigs(value: unknown): ProviderModelConfig[] {
  const root = recordValue(value);
  const candidates = Array.isArray(value)
    ? value
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.models)
        ? root.models
        : [];
  const byId = new Map<string, ProviderModelConfig>();

  for (const item of candidates) {
    const raw = recordValue(item);
    const id = (typeof item === 'string'
      ? item
      : stringValue(raw.id) || stringValue(raw.name) || stringValue(raw.model) || stringValue(raw.slug)).trim();
    if (!id) {
      continue;
    }

    const existing = byId.get(id);
    const limit = recordValue(raw.limit);
    const limits = recordValue(raw.limits);
    const topProvider = recordValue(raw.top_provider);
    byId.set(id, {
      id,
      contextWindow: existing?.contextWindow
        ?? firstPositiveInteger([raw, topProvider], CONTEXT_WINDOW_KEYS)
        ?? firstPositiveInteger([limit, limits], NESTED_CONTEXT_WINDOW_KEYS),
      maxOutputTokens: existing?.maxOutputTokens
        ?? firstPositiveInteger([raw, topProvider], MAX_OUTPUT_TOKEN_KEYS)
        ?? firstPositiveInteger([limit, limits], NESTED_MAX_OUTPUT_TOKEN_KEYS)
    });
  }

  return Array.from(byId.values()).map((model) => {
    const defaults = defaultFetchedModelConfig(model.id);
    return normalizeProviderModels([{
      id: model.id,
      contextWindow: model.contextWindow ?? defaults.contextWindow,
      compactThresholdPercent: defaults.compactThresholdPercent,
      maxOutputTokens: model.maxOutputTokens ?? defaults.maxOutputTokens
    }])[0];
  }).sort((left, right) => left.id.localeCompare(right.id));
}

export function modelsNeedMigration(value: unknown): boolean {
  if (typeof value === 'string') {
    return true;
  }
  return Array.isArray(value) && value.some((item) => {
    if (typeof item === 'string') {
      return true;
    }
    return !item || typeof item !== 'object' || Array.isArray(item);
  });
}

function optionalPositiveInteger(value: unknown, label: string, strict: boolean): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    if (strict) {
      throw new Error(`${label}必须是正整数。`);
    }
    return undefined;
  }
  return number;
}

export function defaultFetchedModelConfig(id: string): ProviderModelConfig {
  const suggestions = getModelParameterSuggestions(id);
  const suggestedContextWindow = suggestions.matchKind === 'fallback'
    ? DEFAULT_FETCHED_CONTEXT_WINDOW
    : suggestions.contextWindow[0]?.value;
  const suggestedMaxOutputTokens = suggestions.maxOutputTokens[0]?.value;
  return {
    id,
    contextWindow: suggestedContextWindow ?? DEFAULT_FETCHED_CONTEXT_WINDOW,
    compactThresholdPercent: suggestions.compactThresholdPercent[0]?.value ?? DEFAULT_COMPACT_THRESHOLD_PERCENT,
    maxOutputTokens: suggestedMaxOutputTokens
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstPositiveInteger(records: Record<string, unknown>[], keys: string[]): number | undefined {
  for (const key of keys) {
    for (const record of records) {
      const value = optionalPositiveInteger(record[key], key, false);
      if (value !== undefined) {
        return value;
      }
    }
  }
  return undefined;
}
