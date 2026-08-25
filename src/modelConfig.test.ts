import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileManagedFields } from './managedFields';
import { baseClaudeModelId, calculateModelLimits, claudeModelVariants, getModelParameterSuggestions } from './modelPresets';
import { mergeFetchedModels, normalizeProviderModels } from './providerModels';

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

test('Claude 1M 后缀归一化且不会重复追加', () => {
  assert.equal(baseClaudeModelId('claude-opus[1M]'), 'claude-opus');
  assert.deepEqual(claudeModelVariants('claude-opus[1m]'), ['claude-opus', 'claude-opus[1m]']);
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
