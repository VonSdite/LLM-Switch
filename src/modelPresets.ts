import { ProviderModelConfig } from './types';

export type ModelParameterCandidateKind = 'official' | 'client-default' | 'derived' | 'fallback';

export interface ModelParameterCandidate {
  value: number;
  kind: ModelParameterCandidateKind;
  label: string;
  sourceUrl?: string;
  checkedAt?: string;
}

export interface ModelParameterSuggestions {
  modelId: string;
  matchedModelId: string;
  matchKind: 'exact' | 'alias' | 'snapshot' | 'fallback';
  sourceLabel: string;
  contextWindow: ModelParameterCandidate[];
  compactThresholdPercent: ModelParameterCandidate[];
  maxOutputTokens: ModelParameterCandidate[];
}

interface PresetEntry {
  ids: string[];
  aliases?: string[];
  sourceLabel: string;
  contextWindow: ModelParameterCandidate[];
  compactThresholdPercent?: ModelParameterCandidate[];
  maxOutputTokens: ModelParameterCandidate[];
}

const BIGMODEL_CODEX_URL = 'https://docs.bigmodel.cn/cn/coding-plan/tool/codex';
const BIGMODEL_GLM_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3';
const DEEPSEEK_URL = 'https://api-docs.deepseek.com/quick_start/pricing';
const QWEN_URL = 'https://help.aliyun.com/zh/model-studio/text-generation-model/';
const MINIMAX_URL = 'https://platform.minimax.io/docs/guides/models-intro';
const OPENAI_GPT_56_SOL_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-sol';
const OPENAI_GPT_56_TERRA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-terra';
const OPENAI_GPT_56_LUNA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-luna';
const OPENAI_GPT_55_URL = 'https://developers.openai.com/api/docs/models/gpt-5.5';
const OPENAI_GPT_54_URL = 'https://developers.openai.com/api/docs/models/gpt-5.4';
const OPENAI_GPT_55_RELEASE_URL = 'https://openai.com/index/introducing-gpt-5-5/';
const OPENAI_CHECKED_AT = '2026-08-26';
const CHECKED_AT = '2026-08-24';

const official = (value: number, label: string, sourceUrl: string): ModelParameterCandidate => ({
  value,
  kind: 'official',
  label,
  sourceUrl,
  checkedAt: CHECKED_AT
});

const clientDefault = (value: number, label: string): ModelParameterCandidate => ({
  value,
  kind: 'client-default',
  label,
  checkedAt: CHECKED_AT
});

const fallback = (value: number, label: string): ModelParameterCandidate => ({
  value,
  kind: 'fallback',
  label
});

const openAiOfficial = (value: number, label: string, sourceUrl: string): ModelParameterCandidate => ({
  value,
  kind: 'official',
  label,
  sourceUrl,
  checkedAt: OPENAI_CHECKED_AT
});

const openAiClientDefault = (value: number, label: string): ModelParameterCandidate => ({
  value,
  kind: 'client-default',
  label,
  checkedAt: OPENAI_CHECKED_AT
});

const gptContextWindows = (apiUrl: string): ModelParameterCandidate[] => [
  openAiClientDefault(372_000, 'Codex 默认上下文 372,000'),
  openAiOfficial(400_000, 'Codex 文档上下文 400,000', OPENAI_GPT_55_RELEASE_URL),
  openAiOfficial(1_050_000, 'API 文档上下文 1,050,000', apiUrl)
];

const gptCompactThreshold = (): ModelParameterCandidate[] => [
  openAiClientDefault(85, 'GPT 建议压缩阈值 85')
];

const gptMaxOutputTokens = (apiUrl: string): ModelParameterCandidate[] => [
  openAiOfficial(128_000, 'API 文档最大输出 128,000', apiUrl)
];

const PRESETS: PresetEntry[] = [
  {
    ids: ['glm-5.3'],
    sourceLabel: '智谱 GLM-5.3 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', BIGMODEL_GLM_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_URL)]
  },
  {
    ids: ['glm-5.2'],
    sourceLabel: '智谱 Coding Plan 官方参数',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', BIGMODEL_CODEX_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_CODEX_URL)]
  },
  {
    ids: ['glm-5.1', 'glm-5', 'glm-5-turbo', 'glm-4.7', 'glm-4.6'],
    sourceLabel: '智谱 Coding Plan 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_CODEX_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_CODEX_URL)]
  },
  {
    ids: ['glm-4.5'],
    sourceLabel: '智谱 Coding Plan 官方参数',
    contextWindow: [official(131_072, '官方上下文 131,072', BIGMODEL_CODEX_URL)],
    maxOutputTokens: [official(98_304, '官方最大输出 98,304', BIGMODEL_CODEX_URL)]
  },
  {
    ids: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4-flash-vision-exp'],
    sourceLabel: 'DeepSeek 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', DEEPSEEK_URL)],
    maxOutputTokens: [official(393_216, '官方最大输出 393,216', DEEPSEEK_URL)]
  },
  {
    ids: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash'],
    sourceLabel: '通义千问官方上下文，输出使用通用候选',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', QWEN_URL)],
    maxOutputTokens: [fallback(32_000, '通用最大输出 32,000（待确认）')]
  },
  {
    ids: ['minimax-m3'],
    sourceLabel: 'MiniMax 官方参数',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', MINIMAX_URL)],
    maxOutputTokens: [
      official(131_072, '官方推荐输出 131,072', MINIMAX_URL),
      official(524_288, '官方输出上限 524,288', MINIMAX_URL)
    ]
  },
  {
    ids: ['minimax-m2.7', 'minimax-m2.5', 'minimax-m2.1', 'minimax-m2'],
    aliases: ['minimax-m2.7-highspeed', 'minimax-m2.5-highspeed', 'minimax-m2.1-highspeed', 'minimax-m2-highspeed'],
    sourceLabel: 'MiniMax 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', MINIMAX_URL)],
    maxOutputTokens: [
      official(65_536, '官方推荐输出 65,536', MINIMAX_URL),
      official(204_800, '官方输出上限 204,800', MINIMAX_URL)
    ]
  },
  {
    ids: ['gpt-5.6-sol'],
    aliases: ['gpt-5.6'],
    sourceLabel: 'Codex 默认值和 OpenAI 文档候选',
    contextWindow: gptContextWindows(OPENAI_GPT_56_SOL_URL),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: gptMaxOutputTokens(OPENAI_GPT_56_SOL_URL)
  },
  {
    ids: ['gpt-5.6-terra'],
    sourceLabel: 'Codex 默认值和 OpenAI 文档候选',
    contextWindow: gptContextWindows(OPENAI_GPT_56_TERRA_URL),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: gptMaxOutputTokens(OPENAI_GPT_56_TERRA_URL)
  },
  {
    ids: ['gpt-5.6-luna'],
    sourceLabel: 'Codex 默认值和 OpenAI 文档候选',
    contextWindow: gptContextWindows(OPENAI_GPT_56_LUNA_URL),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: gptMaxOutputTokens(OPENAI_GPT_56_LUNA_URL)
  },
  {
    ids: ['gpt-5.5'],
    sourceLabel: 'Codex 默认值和 OpenAI 文档候选',
    contextWindow: gptContextWindows(OPENAI_GPT_55_URL),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: gptMaxOutputTokens(OPENAI_GPT_55_URL)
  },
  {
    ids: ['gpt-5.4'],
    sourceLabel: 'Codex 默认值和 OpenAI 文档候选',
    contextWindow: gptContextWindows(OPENAI_GPT_54_URL),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: gptMaxOutputTokens(OPENAI_GPT_54_URL)
  }
];

export const DEFAULT_FETCHED_CONTEXT_WINDOW = 200_000;
export const DEFAULT_COMPACT_THRESHOLD_PERCENT = 60;

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

function modelLookupValues(modelId: string): string[] {
  const normalized = baseClaudeModelId(modelId).toLocaleLowerCase();
  const withoutPrefix = normalized.includes('/') ? normalized.slice(normalized.lastIndexOf('/') + 1) : normalized;
  return Array.from(new Set([normalized, withoutPrefix].filter(Boolean)));
}

function findPreset(lookupValues: string[]): { entry: PresetEntry; matchedModelId: string; matchKind: 'exact' | 'alias' | 'snapshot' } | undefined {
  for (const lookup of lookupValues) {
    for (const entry of PRESETS) {
      const exact = entry.ids.find((id) => id.toLocaleLowerCase() === lookup);
      if (exact) {
        return { entry, matchedModelId: exact, matchKind: 'exact' };
      }
    }
  }
  for (const lookup of lookupValues) {
    for (const entry of PRESETS) {
      const alias = entry.aliases?.find((id) => id.toLocaleLowerCase() === lookup);
      if (alias) {
        return { entry, matchedModelId: alias, matchKind: 'alias' };
      }
    }
  }
  for (const lookup of lookupValues) {
    for (const entry of PRESETS) {
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
