import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileManagedFields } from './managedFields';
import { CLAUDE_CODE_MAX_OUTPUT_TOKENS_LIMIT, baseClaudeModelId, calculateModelLimits, claudeCodeMaxOutputTokens, claudeModelVariants, getModelParameterSuggestions } from './modelPresets';
import { extractFetchedModelConfigs, mergeFetchedModels, normalizeProviderModels } from './providerModels';

test('旧字符串模型迁移后只保留模型 ID', () => {
  assert.deepEqual(normalizeProviderModels(['glm-5.3', 'deepseek-v4-pro']), [
    { id: 'deepseek-v4-pro', contextWindow: undefined, compactThresholdPercent: undefined, maxOutputTokens: undefined },
    { id: 'glm-5.3', contextWindow: undefined, compactThresholdPercent: undefined, maxOutputTokens: undefined }
  ]);
});

test('严格校验拒绝大于上下文窗口的最大输出', () => {
  assert.throws(() => normalizeProviderModels([{
    id: 'custom-model',
    contextWindow: 128_000,
    compactThresholdPercent: 80,
    maxOutputTokens: 128_001
  }], true), /最大输出不能大于上下文窗口/);
});

test('严格保存 Provider 时忽略空模型 ID 行', () => {
  assert.deepEqual(normalizeProviderModels([
    { id: 'glm-5.3', contextWindow: 1_048_576, compactThresholdPercent: 60 },
    { id: '', contextWindow: 200_000, compactThresholdPercent: 60, maxOutputTokens: 32_000 },
    { id: '   ', contextWindow: 128_000 }
  ], true), [
    { id: 'glm-5.3', contextWindow: 1_048_576, compactThresholdPercent: 60, maxOutputTokens: undefined }
  ]);
});

test('拉取模型按 ID 保留参数并为新模型补默认参数', () => {
  const merged = mergeFetchedModels([{
    id: 'glm-5.3',
    contextWindow: 1_048_576,
    compactThresholdPercent: 75,
    maxOutputTokens: 131_072
  }], ['glm-5.3', 'glm-5.2', 'unknown-model']);
  assert.deepEqual(merged, [
    { id: 'glm-5.2', contextWindow: 1_000_000, compactThresholdPercent: 60, maxOutputTokens: 131_072 },
    { id: 'glm-5.3', contextWindow: 1_048_576, compactThresholdPercent: 75, maxOutputTokens: 131_072 },
    { id: 'unknown-model', contextWindow: 200_000, compactThresholdPercent: 60, maxOutputTokens: 32_000 }
  ]);
});

test('拉取模型优先采用接口返回的上下文和最大输出元数据', () => {
  assert.deepEqual(extractFetchedModelConfigs({
    data: [
      { id: 'nested-model', limits: { context: 500_000, output: 80_000 } },
      { id: 'openrouter-model', context_length: 300_000, top_provider: { max_completion_tokens: 64_000 } },
      { slug: 'gpt-6-astra', context_window: 272_000, max_context_window: 872_000 },
      { id: 'max-only-model', max_context_window: 872_000, max_output_tokens: 128_000 },
      { name: 'snake-case-model', context_window: '200000', max_output_tokens: '32000' },
      'unknown-model'
    ]
  }), [
    { id: 'gpt-6-astra', contextWindow: 272_000, compactThresholdPercent: 85, maxOutputTokens: 128_000 },
    { id: 'max-only-model', contextWindow: 872_000, compactThresholdPercent: 60, maxOutputTokens: 128_000 },
    { id: 'nested-model', contextWindow: 500_000, compactThresholdPercent: 60, maxOutputTokens: 80_000 },
    { id: 'openrouter-model', contextWindow: 300_000, compactThresholdPercent: 60, maxOutputTokens: 64_000 },
    { id: 'snake-case-model', contextWindow: 200_000, compactThresholdPercent: 60, maxOutputTokens: 32_000 },
    { id: 'unknown-model', contextWindow: 200_000, compactThresholdPercent: 60, maxOutputTokens: 32_000 }
  ]);
});

test('内置候选支持精确、别名、日期快照和通用回退', () => {
  assert.equal(getModelParameterSuggestions('glm-5.3').contextWindow[0].value, 1_048_576);
  assert.equal(getModelParameterSuggestions('MiniMax-M2.7-highspeed').matchKind, 'alias');
  assert.equal(getModelParameterSuggestions('provider/glm-5.3-20260824').matchKind, 'snapshot');
  const unknown = getModelParameterSuggestions('my-private-model');
  assert.equal(unknown.matchKind, 'fallback');
  assert.equal(unknown.contextWindow[0].value, 200_000);
  assert.equal(unknown.compactThresholdPercent[0].value, 60);
  assert.equal(unknown.maxOutputTokens[0].value, 32_000);
});

test('GPT 内置候选使用 85 压缩阈值', () => {
  const suggestions = getModelParameterSuggestions('gpt-5.6-sol');
  assert.deepEqual(suggestions.contextWindow.map((candidate) => candidate.value), [372_000, 400_000, 1_050_000]);
  assert.equal(suggestions.compactThresholdPercent[0].value, 85);
  assert.deepEqual(getModelParameterSuggestions('gpt-5.5').contextWindow.map((candidate) => candidate.value), [372_000, 400_000, 1_050_000]);
  assert.equal(getModelParameterSuggestions('gpt-5.5').compactThresholdPercent[0].value, 85);
  assert.equal(getModelParameterSuggestions('gpt-5.6').matchKind, 'alias');
  assert.deepEqual(mergeFetchedModels([], ['gpt-5.6-sol']), [
    { id: 'gpt-5.6-sol', contextWindow: 372_000, compactThresholdPercent: 85, maxOutputTokens: 128_000 }
  ]);
  assert.deepEqual(mergeFetchedModels([], ['gpt-5.5']), [
    { id: 'gpt-5.5', contextWindow: 372_000, compactThresholdPercent: 85, maxOutputTokens: 128_000 }
  ]);
});

test('最新模型使用各自的内置默认参数', () => {
  assert.deepEqual(mergeFetchedModels([], ['gpt-6-astra', 'qwen3.8-max', 'qwen3.8-flash', 'glm-5.3', 'glm-5.3-flash']), [
    { id: 'glm-5.3', contextWindow: 1_048_576, compactThresholdPercent: 60, maxOutputTokens: 131_072 },
    { id: 'glm-5.3-flash', contextWindow: 1_048_576, compactThresholdPercent: 60, maxOutputTokens: 131_072 },
    { id: 'gpt-6-astra', contextWindow: 272_000, compactThresholdPercent: 85, maxOutputTokens: 128_000 },
    { id: 'qwen3.8-flash', contextWindow: 1_000_000, compactThresholdPercent: 60, maxOutputTokens: 131_072 },
    { id: 'qwen3.8-max', contextWindow: 1_000_000, compactThresholdPercent: 60, maxOutputTokens: 131_072 }
  ]);
  assert.deepEqual(getModelParameterSuggestions('gpt-6-astra').contextWindow.map((candidate) => candidate.value), [272_000, 872_000]);
  assert.deepEqual(extractFetchedModelConfigs({ data: [{ id: 'gpt-6-astra' }] }), [
    { id: 'gpt-6-astra', contextWindow: 272_000, compactThresholdPercent: 85, maxOutputTokens: 128_000 }
  ]);
  assert.equal(getModelParameterSuggestions('provider/gpt-6-astra-20260906').matchKind, 'snapshot');
});

test('新增 OpenAI、Claude 和 DeepSeek 模型使用集中台账参数', () => {
  const configs = new Map(mergeFetchedModels([], [
    'gpt-6-sol',
    'gpt-6-luna',
    'gpt-daybreak-blue-latest',
    'gpt-daybreak-red-latest',
    'claude-opus-4-8',
    'claude-opus-5',
    'claude-opus-5-5',
    'claude-sonnet-5',
    'claude-fable-5-1',
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
    'deepseek-v3.2',
    'deepseek-4.1-flash',
    'deepseek-v4-pro'
  ]).map((model) => [model.id, model]));

  assert.deepEqual(configs.get('gpt-6-sol'), {
    id: 'gpt-6-sol',
    contextWindow: 272_000,
    compactThresholdPercent: 85,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('gpt-daybreak-red-latest'), {
    id: 'gpt-daybreak-red-latest',
    contextWindow: 372_000,
    compactThresholdPercent: 85,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('gpt-6-luna'), {
    id: 'gpt-6-luna',
    contextWindow: 272_000,
    compactThresholdPercent: 85,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('claude-opus-5-5'), {
    id: 'claude-opus-5-5',
    contextWindow: 1_000_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('claude-sonnet-5'), {
    id: 'claude-sonnet-5',
    contextWindow: 1_000_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 64_000
  });
  assert.deepEqual(configs.get('claude-fable-5-1'), {
    id: 'claude-fable-5-1',
    contextWindow: 1_000_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('claude-opus-4-7'), {
    id: 'claude-opus-4-7',
    contextWindow: 1_000_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 128_000
  });
  assert.deepEqual(configs.get('claude-sonnet-4-6'), {
    id: 'claude-sonnet-4-6',
    contextWindow: 1_000_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 64_000
  });
  assert.deepEqual(configs.get('claude-haiku-4-5'), {
    id: 'claude-haiku-4-5',
    contextWindow: 200_000,
    compactThresholdPercent: 60,
    maxOutputTokens: 64_000
  });
  assert.deepEqual(configs.get('deepseek-v3.2'), {
    id: 'deepseek-v3.2',
    contextWindow: 163_840,
    compactThresholdPercent: 60,
    maxOutputTokens: 65_536
  });
  assert.deepEqual(configs.get('deepseek-4.1-flash'), {
    id: 'deepseek-4.1-flash',
    contextWindow: 1_048_576,
    compactThresholdPercent: 60,
    maxOutputTokens: 393_216
  });
  assert.equal(getModelParameterSuggestions('deepseek-flash').matchKind, 'exact');
  assert.equal(getModelParameterSuggestions('deepseek-v4.1-flash').matchKind, 'exact');
  assert.equal(getModelParameterSuggestions('provider/claude-sonnet-4-6-20260924').matchKind, 'snapshot');
  assert.equal(getModelParameterSuggestions('claude-sonnet-4').matchKind, 'alias');
  assert.equal(getModelParameterSuggestions('claude-opus-5-5-20260922').matchKind, 'snapshot');
  assert.equal(getModelParameterSuggestions('gpt-daybreak-blue-latest').contextWindow[0].value, 272_000);
  assert.deepEqual(getModelParameterSuggestions('gpt-6-sol').contextWindow.map((candidate) => candidate.value), [272_000, 872_000]);
});

test('Kimi 系列使用官方上下文和输出默认值', () => {
  assert.deepEqual(mergeFetchedModels([], ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.7-code-highspeed', 'kimi-k2.6']), [
    { id: 'kimi-k2.6', contextWindow: 262_144, compactThresholdPercent: 60, maxOutputTokens: 32_768 },
    { id: 'kimi-k2.7-code', contextWindow: 262_144, compactThresholdPercent: 60, maxOutputTokens: 32_768 },
    { id: 'kimi-k2.7-code-highspeed', contextWindow: 262_144, compactThresholdPercent: 60, maxOutputTokens: 32_768 },
    { id: 'kimi-k3', contextWindow: 1_048_576, compactThresholdPercent: 60, maxOutputTokens: 131_072 }
  ]);
  assert.deepEqual(getModelParameterSuggestions('kimi-k3').maxOutputTokens.map((candidate) => candidate.value), [131_072, 1_048_576]);
  assert.equal(getModelParameterSuggestions('provider/kimi-k2.7-code').matchKind, 'exact');
  assert.equal(getModelParameterSuggestions('KIMI-K2.7-CODE-HIGHSPEED').matchKind, 'alias');
  assert.equal(getModelParameterSuggestions('kimi-k2.6-20260903').matchKind, 'snapshot');
});

test('Claude 1M 后缀归一化且不会重复追加', () => {
  assert.equal(baseClaudeModelId('claude-opus[1M]'), 'claude-opus');
  assert.deepEqual(claudeModelVariants('claude-opus[1m]'), ['claude-opus', 'claude-opus[1m]']);
});

test('Claude Code 最大输出按客户端上限写入', () => {
  assert.equal(claudeCodeMaxOutputTokens(32_000), 32_000);
  assert.equal(claudeCodeMaxOutputTokens(131_072), CLAUDE_CODE_MAX_OUTPUT_TOKENS_LIMIT);
  assert.equal(claudeCodeMaxOutputTokens(undefined), undefined);
});

test('百分比换算生成压缩位置和预留窗口', () => {
  assert.deepEqual(calculateModelLimits({
    id: 'model',
    contextWindow: 1_000_000,
    compactThresholdPercent: 80,
    maxOutputTokens: 128_000
  }), {
    compactAtTokens: 800_000,
    reserved: 200_000
  });
});

test('未选择压缩阈值时不生成压缩参数', () => {
  assert.deepEqual(calculateModelLimits({
    id: 'model',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000
  }), {});
});

test('配置所有权只清理仍等于上次下发值的字段', () => {
  const config: Record<string, unknown> = {
    env: {
      owned: 'plugin-value',
      changedByUser: 'user-value'
    }
  };
  reconcileManagedFields(config, [
    { path: ['env', 'owned'], value: 'plugin-value' },
    { path: ['env', 'changedByUser'], value: 'plugin-value' }
  ], [
    { path: ['env', 'next'], value: 'next-value' }
  ]);
  assert.deepEqual(config, {
    env: {
      changedByUser: 'user-value',
      next: 'next-value'
    }
  });
});

test('配置所有权清理空的插件配置容器', () => {
  const config: Record<string, unknown> = {
    provider: {
      old: {
        options: {
          apiKey: 'token'
        }
      }
    }
  };
  reconcileManagedFields(config, [{
    path: ['provider', 'old', 'options', 'apiKey'],
    value: 'token'
  }], []);
  assert.deepEqual(config, {});
});
