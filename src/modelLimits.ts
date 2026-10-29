// 模型参数台账。新增模型时在这里维护模型 ID、上下文窗口和最大输出。

export type ModelParameterCandidateKind = 'official' | 'client-default' | 'derived' | 'fallback';

export interface ModelParameterCandidate {
  value: number;
  kind: ModelParameterCandidateKind;
  label: string;
  sourceUrl?: string;
  checkedAt?: string;
}

export interface ModelLimitPreset {
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
const KIMI_K31_PRO_URL = 'https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart';
const KIMI_K27_CODE_URL = 'https://platform.moonshot.cn/docs/guide/kimi-k2-7-code-quickstart';
const KIMI_K26_URL = 'https://platform.moonshot.cn/docs/guide/kimi-k2-6-quickstart';
const OPENAI_GPT_61_TERRA_URL = 'https://developers.openai.com/api/docs/models/gpt-6.1-terra';
const OPENAI_GPT_56_SOL_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-sol';
const OPENAI_GPT_56_TERRA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-terra';
const OPENAI_GPT_56_LUNA_URL = 'https://developers.openai.com/api/docs/models/gpt-5.6-luna';
const OPENAI_GPT_55_URL = 'https://developers.openai.com/api/docs/models/gpt-5.5';
const OPENAI_GPT_54_URL = 'https://developers.openai.com/api/docs/models/gpt-5.4';
const OPENAI_GPT_55_RELEASE_URL = 'https://openai.com/index/introducing-gpt-5-5/';
const OPENAI_MODELS_URL = 'https://developers.openai.com/api/docs/models';
const ANTHROPIC_MODELS_URL = 'https://docs.anthropic.com/en/docs/about-claude/models/overview';
const ANTHROPIC_SONNET_55_SYSTEM_CARD_URL = 'https://www.anthropic.com/claude-sonnet-5-5-system-card';
const ANTHROPIC_HAIKU_55_SYSTEM_CARD_URL = 'https://www.anthropic.com/claude-haiku-5-5-system-card';
const OPENAI_CHECKED_AT = '2026-08-26';
const CHECKED_AT = '2026-08-26';
const CURRENT_CHECKED_AT = '2026-09-06';
const LATEST_CHECKED_AT = '2026-09-24';
const UPDATED_CHECKED_AT = '2026-10-08';
const NEWEST_CHECKED_AT = '2026-10-29';

const official = (value: number, label: string, sourceUrl: string, checkedAt = CHECKED_AT): ModelParameterCandidate => ({
  value,
  kind: 'official',
  label,
  sourceUrl,
  checkedAt
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

const anthropicOfficial = (value: number, label: string): ModelParameterCandidate => official(
  value,
  label,
  ANTHROPIC_MODELS_URL,
  LATEST_CHECKED_AT
);

const deepSeekOfficial = (value: number, label: string): ModelParameterCandidate => official(
  value,
  label,
  DEEPSEEK_URL,
  LATEST_CHECKED_AT
);

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

const currentCodexContextWindows = (defaultContextWindow: number): ModelParameterCandidate[] => [
  openAiClientDefault(defaultContextWindow, `Codex 默认上下文 ${defaultContextWindow.toLocaleString()}`, LATEST_CHECKED_AT),
  openAiClientDefault(872_000, 'Codex 最大上下文 872,000', LATEST_CHECKED_AT)
];

const currentCodexMaxOutputTokens = (): ModelParameterCandidate[] => [
  openAiClientDefault(128_000, 'Codex 默认最大输出 128,000', LATEST_CHECKED_AT)
];

export const MODEL_LIMITS: ModelLimitPreset[] = [
  // 智谱
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

  // DeepSeek
  {
    ids: ['deepseek-flash', 'deepseek-4.1-flash', 'deepseek-v4.1-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp'],
    sourceLabel: 'DeepSeek V4.1 Flash 官方参数',
    contextWindow: [deepSeekOfficial(1_048_576, '官方上下文 1,048,576')],
    maxOutputTokens: [deepSeekOfficial(393_216, '官方最大输出 393,216')]
  },
  {
    ids: ['deepseek-v4-pro'],
    sourceLabel: 'DeepSeek V4 Pro 官方参数',
    contextWindow: [deepSeekOfficial(1_048_576, '官方上下文 1,048,576')],
    maxOutputTokens: [deepSeekOfficial(393_216, '官方最大输出 393,216')]
  },
  {
    ids: ['deepseek-v3.2', 'deepseek-v3.2-thinking', 'deepseek-v3.2-exp', 'deepseek-v3.2-exp-thinking'],
    sourceLabel: 'DeepSeek V3.2 模型目录参数',
    contextWindow: [deepSeekOfficial(163_840, '模型目录上下文 163,840')],
    maxOutputTokens: [deepSeekOfficial(65_536, '模型目录最大输出 65,536')]
  },
  {
    ids: ['deepseek-chat'],
    sourceLabel: 'DeepSeek Chat 官方参数',
    contextWindow: [deepSeekOfficial(128_000, '官方上下文 128,000')],
    maxOutputTokens: [deepSeekOfficial(8_192, '官方最大输出 8,192')]
  },
  {
    ids: ['deepseek-reasoner'],
    sourceLabel: 'DeepSeek Reasoner 官方参数',
    contextWindow: [deepSeekOfficial(128_000, '官方上下文 128,000')],
    maxOutputTokens: [deepSeekOfficial(65_536, '官方最大输出 65,536')]
  },

  // 通义千问
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

  // MiniMax
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

  // Moonshot
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
    ids: ['kimi-k3.1-pro'],
    aliases: ['kimi-k3.1', 'kimi-k3.1-pro-highspeed', 'kimi-k3-1-pro', 'kimi-k3-1-pro-highspeed'],
    sourceLabel: 'Moonshot Kimi K3.1 Pro 官方参数',
    contextWindow: [official(1_048_576, '官方上下文 1,048,576', KIMI_K31_PRO_URL, NEWEST_CHECKED_AT)],
    maxOutputTokens: [
      official(131_072, '官方默认输出 131,072', KIMI_K31_PRO_URL, NEWEST_CHECKED_AT),
      official(1_048_576, '官方最大输出 1,048,576', KIMI_K31_PRO_URL, NEWEST_CHECKED_AT)
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

  // Anthropic Claude
  {
    ids: ['claude-opus-5-5', 'claude-opus-5', 'claude-opus-4-8'],
    sourceLabel: 'Anthropic Claude Opus 新模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(128_000, '模型目录最大输出 128,000')]
  },
  {
    ids: ['claude-sonnet-5-5'],
    sourceLabel: 'Anthropic Claude Sonnet 5.5 系统卡上下文和系列输出建议',
    contextWindow: [official(1_000_000, '系统卡上下文 1,000,000', ANTHROPIC_SONNET_55_SYSTEM_CARD_URL, UPDATED_CHECKED_AT)],
    maxOutputTokens: [fallback(64_000, 'Claude 系列建议最大输出 64,000')]
  },
  {
    ids: ['claude-sonnet-5'],
    sourceLabel: 'Anthropic Claude Sonnet 5 模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },
  {
    ids: ['claude-fable-5-1', 'claude-fable-5', 'claude-mythos-5-1', 'claude-mythos-5', 'claude-mythos-preview'],
    sourceLabel: 'Anthropic Claude Fable/Mythos 模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(128_000, '模型目录最大输出 128,000')]
  },
  {
    ids: ['claude-opus-4-7'],
    sourceLabel: 'Anthropic Claude Opus 4.7 模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(128_000, '模型目录最大输出 128,000')]
  },
  {
    ids: ['claude-opus-4-6'],
    sourceLabel: 'Anthropic Claude Opus 4.6 模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(128_000, '模型目录最大输出 128,000')]
  },
  {
    ids: ['claude-sonnet-4-6'],
    sourceLabel: 'Anthropic Claude Sonnet 4.6 模型参数',
    contextWindow: [anthropicOfficial(1_000_000, '模型目录上下文 1,000,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },
  {
    ids: ['claude-opus-4-5'],
    sourceLabel: 'Anthropic Claude Opus 4.5 模型参数',
    contextWindow: [anthropicOfficial(200_000, '模型目录上下文 200,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },
  {
    ids: ['claude-sonnet-4-5'],
    sourceLabel: 'Anthropic Claude Sonnet 4.5 模型参数',
    contextWindow: [anthropicOfficial(200_000, '模型目录上下文 200,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },
  {
    ids: ['claude-haiku-5-5'],
    sourceLabel: 'Anthropic Claude Haiku 5.5 系统卡上下文和系列输出建议',
    contextWindow: [official(1_000_000, '系统卡上下文 1,000,000', ANTHROPIC_HAIKU_55_SYSTEM_CARD_URL, UPDATED_CHECKED_AT)],
    maxOutputTokens: [fallback(64_000, 'Claude 系列建议最大输出 64,000')]
  },
  {
    ids: ['claude-haiku-4-5'],
    sourceLabel: 'Anthropic Claude Haiku 4.5 模型参数',
    contextWindow: [anthropicOfficial(200_000, '模型目录上下文 200,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },
  {
    ids: ['claude-opus-4-1'],
    sourceLabel: 'Anthropic Claude Opus 4.1 模型参数',
    contextWindow: [anthropicOfficial(200_000, '模型目录上下文 200,000')],
    maxOutputTokens: [anthropicOfficial(32_000, '模型目录最大输出 32,000')]
  },
  {
    ids: ['claude-sonnet-4-0'],
    aliases: ['claude-sonnet-4'],
    sourceLabel: 'Anthropic Claude Sonnet 4 模型参数',
    contextWindow: [anthropicOfficial(200_000, '模型目录上下文 200,000')],
    maxOutputTokens: [anthropicOfficial(64_000, '模型目录最大输出 64,000')]
  },

  // OpenAI / Codex
  {
    ids: ['gpt-6.1-sol'],
    sourceLabel: 'GPT-6.1 Sol Codex 目录参数和 GPT 系列输出建议',
    contextWindow: [
      openAiClientDefault(272_000, 'Codex 默认上下文 272,000', UPDATED_CHECKED_AT),
      openAiClientDefault(872_000, 'Codex 最大上下文 872,000', UPDATED_CHECKED_AT)
    ],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [fallback(128_000, 'GPT 系列建议最大输出 128,000')]
  },
  {
    ids: ['gpt-6.1-terra'],
    aliases: ['gpt-6.1-terra-pro', 'gpt-6.1-terra-fast'],
    sourceLabel: 'GPT-6.1 Terra Codex 目录参数和 OpenAI 文档候选',
    contextWindow: [
      openAiClientDefault(272_000, 'Codex 默认上下文 272,000', NEWEST_CHECKED_AT),
      openAiClientDefault(872_000, 'Codex 最大上下文 872,000', NEWEST_CHECKED_AT),
      official(1_050_000, 'API 文档上下文 1,050,000', OPENAI_GPT_61_TERRA_URL, NEWEST_CHECKED_AT)
    ],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [official(128_000, 'API 文档最大输出 128,000', OPENAI_GPT_61_TERRA_URL, NEWEST_CHECKED_AT)]
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
    ids: ['gpt-6-sol', 'gpt-6-luna'],
    sourceLabel: 'OpenAI Codex 最新模型目录参数',
    contextWindow: currentCodexContextWindows(272_000),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: currentCodexMaxOutputTokens()
  },
  {
    ids: ['gpt-daybreak-blue-latest'],
    sourceLabel: 'OpenAI Codex Daybreak Blue 模型目录参数',
    contextWindow: currentCodexContextWindows(272_000),
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: currentCodexMaxOutputTokens()
  },
  {
    ids: ['gpt-daybreak-red-latest'],
    sourceLabel: 'OpenAI Codex Daybreak Red 模型目录参数',
    contextWindow: [openAiClientDefault(372_000, 'Codex 默认上下文 372,000', LATEST_CHECKED_AT)],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: currentCodexMaxOutputTokens()
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
  },
  {
    ids: ['gpt-5.5-pro'],
    sourceLabel: 'OpenAI 模型目录参数',
    contextWindow: [openAiOfficial(1_050_000, 'API 文档上下文 1,050,000', OPENAI_MODELS_URL)],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [openAiOfficial(128_000, 'API 文档最大输出 128,000', OPENAI_MODELS_URL)]
  },
  {
    ids: ['gpt-5.4-pro'],
    sourceLabel: 'OpenAI 模型目录参数',
    contextWindow: [openAiOfficial(1_050_000, 'API 文档上下文 1,050,000', OPENAI_MODELS_URL)],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [openAiOfficial(128_000, 'API 文档最大输出 128,000', OPENAI_MODELS_URL)]
  },
  {
    ids: ['gpt-5.4-mini', 'gpt-5.4-nano'],
    sourceLabel: 'OpenAI 模型目录参数',
    contextWindow: [openAiOfficial(400_000, 'API 文档上下文 400,000', OPENAI_MODELS_URL)],
    compactThresholdPercent: gptCompactThreshold(),
    maxOutputTokens: [openAiOfficial(128_000, 'API 文档最大输出 128,000', OPENAI_MODELS_URL)]
  }
];
