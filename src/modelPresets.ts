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

const BIGMODEL_GLM_53_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3';
const BIGMODEL_GLM_53_FLASH_URL = 'https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash';
const BIGMODEL_GLM_52_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2';
const BIGMODEL_GLM_51_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1';
const BIGMODEL_GLM_5_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5';
const BIGMODEL_GLM_5_TURBO_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo';
const BIGMODEL_GLM_47_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7';
const BIGMODEL_GLM_46_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6';
const BIGMODEL_GLM_45_URL = 'https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5';
const DEEPSEEK_URL = 'https://api-docs.deepseek.com/quick_start/pricing';
const QWEN_URL = 'https://help.aliyun.com/zh/model-studio/text-generation-model/';
const MINIMAX_URL = 'https://platform.minimax.io/docs/guides/models-intro';
const KIMI_K3_URL = 'https://platform.moonshot.cn/docs/guide/kimi-k3-quickstart';
const KIMI_K27_CODE_URL = 'https://platform.moonshot.cn/docs/guide/kimi-k2-7-code-quickstart';
const KIMI_K26_URL = 'https://platform.moonshot.cn/docs/guide/kimi-k2-6-quickstart';
const OPENAI_GPT_56_SOL_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-sol';
const OPENAI_GPT_56_TERRA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-terra';
const OPENAI_GPT_56_LUNA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-luna';
const OPENAI_GPT_55_URL = 'https://developers.openai.com/api/docs/models/gpt-5.5';
const OPENAI_GPT_54_URL = 'https://developers.openai.com/api/docs/models/gpt-5.4';
const OPENAI_GPT_55_RELEASE_URL = 'https://openai.com/index/introducing-gpt-5-5/';
const OPENAI_CHECKED_AT = '2026-08-26';
const CHECKED_AT = '2026-08-26';
const CURRENT_CHECKED_AT = '2026-09-06';

const official = (value: number, label: string, sourceUrl: string, checkedAt = CHECKED_AT): ModelParameterCandidate => ({
  value,
  kind: 'official',
  label,
  sourceUrl,
  checkedAt
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

const openAiClientDefault = (value: number, label: string, checkedAt = OPENAI_CHECKED_AT): ModelParameterCandidate => ({
  value,
  kind: 'client-default',
  label,
  checkedAt
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
    ids: ['glm-5.3-flash'],
    sourceLabel: '智谱 GLM-5.3-Flash 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', BIGMODEL_GLM_53_FLASH_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_53_FLASH_URL, CURRENT_CHECKED_AT)]
  },
  {
    ids: ['glm-5.3'],
    sourceLabel: '智谱 GLM-5.3 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', BIGMODEL_GLM_53_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_53_URL, CURRENT_CHECKED_AT)]
  },
  {
    ids: ['glm-5.2'],
    sourceLabel: '智谱 GLM-5.2 官方参数',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', BIGMODEL_GLM_52_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_52_URL)]
  },
  {
    ids: ['glm-5.1'],
    sourceLabel: '智谱 GLM-5.1 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_GLM_51_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_51_URL)]
  },
  {
    ids: ['glm-5'],
    sourceLabel: '智谱 GLM-5 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_GLM_5_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_5_URL)]
  },
  {
    ids: ['glm-5-turbo'],
    sourceLabel: '智谱 GLM-5-Turbo 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_GLM_5_TURBO_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_5_TURBO_URL)]
  },
  {
    ids: ['glm-4.7'],
    sourceLabel: '智谱 GLM-4.7 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_GLM_47_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_47_URL)]
  },
  {
    ids: ['glm-4.6'],
    sourceLabel: '智谱 GLM-4.6 官方参数',
    contextWindow: [official(204_800, '官方上下文 204,800', BIGMODEL_GLM_46_URL)],
    maxOutputTokens: [official(131_072, '官方最大输出 131,072', BIGMODEL_GLM_46_URL)]
  },
  {
    ids: ['glm-4.5'],
    sourceLabel: '智谱 GLM-4.5 官方参数',
    contextWindow: [official(131_072, '官方上下文 131,072', BIGMODEL_GLM_45_URL)],
    maxOutputTokens: [official(98_304, '官方最大输出 98,304', BIGMODEL_GLM_45_URL)]
  },
  {
    ids: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4-flash-vision-exp'],
    sourceLabel: 'DeepSeek 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', DEEPSEEK_URL)],
    maxOutputTokens: [official(393_216, '官方最大输出 393,216', DEEPSEEK_URL)]
  },
  {
    ids: ['qwen3.8-max', 'qwen3.8-flash'],
    sourceLabel: '通义千问官方上下文和内置输出参数',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', QWEN_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [fallback(131_072, '内置最大输出 131,072')]
  },
  {
    ids: ['qwen3.7-plus', 'qwen3.7-flash'],
    sourceLabel: '通义千问官方上下文，输出使用通用候选',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', QWEN_URL)],
    maxOutputTokens: [fallback(32_000, '通用最大输出 32,000（待确认）')]
  },
  {
    ids: ['minimax-m3'],
    sourceLabel: 'MiniMax 官方上下文和输出参数',
    contextWindow: [official(1_000_000, '官方上下文 1,000,000', MINIMAX_URL)],
    maxOutputTokens: [
      official(131_072, '官方推荐输出 131,072', MINIMAX_URL),
      official(524_288, '官方输出上限 524,288', MINIMAX_URL)
    ]
  },
  {
    ids: ['minimax-m2.7', 'minimax-m2.5', 'minimax-m2.1'],
    aliases: ['minimax-m2.7-highspeed', 'minimax-m2.5-highspeed', 'minimax-m2.1-highspeed'],
    sourceLabel: 'MiniMax 官方上下文和输出参数',
    contextWindow: [official(204_800, '官方上下文 204,800', MINIMAX_URL)],
    maxOutputTokens: [
      official(65_536, '官方推荐输出 65,536', MINIMAX_URL),
      official(204_800, '官方输出上限 204,800', MINIMAX_URL)
    ]
  },
  {
    ids: ['minimax-m2'],
    aliases: ['minimax-m2-highspeed'],
    sourceLabel: 'MiniMax 官方上下文和输出参数',
    contextWindow: [official(204_800, '官方上下文 204,800', MINIMAX_URL)],
    maxOutputTokens: [
      official(65_536, '官方推荐输出 65,536', MINIMAX_URL),
      official(204_800, '官方输出上限 204,800', MINIMAX_URL)
    ]
  },
  {
    ids: ['kimi-k3'],
    sourceLabel: 'Moonshot Kimi K3 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', KIMI_K3_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [
      official(131_072, '官方默认输出 131,072', KIMI_K3_URL, CURRENT_CHECKED_AT),
      official(1_048_576, '官方最大输出 1,048,576', KIMI_K3_URL, CURRENT_CHECKED_AT)
    ]
  },
  {
    ids: ['kimi-k2.7-code'],
    aliases: ['kimi-k2.7-code-highspeed'],
    sourceLabel: 'Moonshot Kimi K2.7 Code 官方参数',
    contextWindow: [official(262_144, '官方上下文 262,144', KIMI_K27_CODE_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [official(32_768, '官方默认输出 32,768', KIMI_K27_CODE_URL, CURRENT_CHECKED_AT)]
  },
  {
    ids: ['kimi-k2.6'],
    sourceLabel: 'Moonshot Kimi K2.6 官方参数',
    contextWindow: [official(262_144, '官方上下文 262,144', KIMI_K26_URL, CURRENT_CHECKED_AT)],
    maxOutputTokens: [official(32_768, '官方默认输出 32,768', KIMI_K26_URL, CURRENT_CHECKED_AT)]
  },
  {
    ids: ['gpt-6-astra'],
    sourceLabel: 'GPT-6 Astra Codex 默认值和最大上下文候选',
    contextWindow: [
      openAiClientDefault(272_000, 'Codex 默认上下文 272,000', CURRENT_CHECKED_AT),
      openAiClientDefault(872_000, 'Codex 最大上下文 872,000', CURRENT_CHECKED_AT)
    ],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [openAiClientDefault(128_000, '默认最大输出 128,000', CURRENT_CHECKED_AT)]
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
export const CLAUDE_CODE_MAX_OUTPUT_TOKENS_LIMIT = 64_000;

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
