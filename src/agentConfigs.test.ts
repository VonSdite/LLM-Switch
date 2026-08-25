import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import Module from 'node:module';
import test from 'node:test';
import * as TOML from '@iarna/toml';
import { CLAUDE_MODEL_KEYS, ProviderConfig, SaveClaudePayload, SaveCodexPayload } from './types';

interface FakeUri {
  fsPath: string;
  toString(): string;
}

test('三类 Agent 按模型参数下发配置并保留用户手改值', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-switch-test-'));
  try {
    const globalStoragePath = path.join(tempRoot, 'storage');
    const claudePath = path.join(tempRoot, 'claude.json');
    const codexPath = path.join(tempRoot, 'config.toml');
    const codexAuthPath = path.join(tempRoot, 'auth.json');
    const opencodePath = path.join(tempRoot, 'opencode.json');
    await fs.mkdir(globalStoragePath, { recursive: true });
    await Promise.all([
      fs.writeFile(claudePath, '{}\n'),
      fs.writeFile(codexPath, ''),
      fs.writeFile(codexAuthPath, '{}\n'),
      fs.writeFile(opencodePath, '{}\n'),
      fs.writeFile(path.join(globalStoragePath, 'agentConfigPaths.json'), JSON.stringify({
        claude: claudePath,
        codex: codexPath,
        codexAuth: codexAuthPath,
        opencode: opencodePath
      }))
    ]);

    const fakeVscode = createFakeVscode();
    const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, ...args: unknown[]): unknown {
      if (request === 'vscode') {
        return fakeVscode;
      }
      return originalLoad.call(this, request, ...args);
    };
    let agentConfigs: typeof import('./agentConfigs');
    try {
      agentConfigs = require('./agentConfigs') as typeof import('./agentConfigs');
    } finally {
      (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = originalLoad;
    }

    const context = {
      globalStorageUri: fakeUri(globalStoragePath),
      globalState: { get: (_key: string, fallback: unknown) => fallback },
      secrets: { delete: async () => undefined }
    } as never;
    const provider = providerFixture();
    const claudePayload: SaveClaudePayload = {
      providerId: provider.id,
      models: {
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5.3[1m]',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.3[1m]',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.3[1m]',
        ANTHROPIC_MODEL: 'glm-5.3[1m]',
        ANTHROPIC_REASONING_MODEL: 'glm-5.3[1m]'
      },
      runtimeSettings: {
        autoCompactPctOverride: 95,
        attributionHeader: 'disabled',
        disableNonessentialTraffic: 'enabled',
        experimentalAgentTeams: 'enabled',
        enableToolSearch: 'enabled',
        sandbox: 'enabled'
      }
    };
    const codexPayload: SaveCodexPayload = {
      providerId: provider.id,
      model: 'glm-5.3',
      runtimeSettings: {
        serviceTier: 'priority',
        sandboxMode: 'workspace-write',
        approvalPolicy: 'on-request'
      }
    };

    await agentConfigs.saveClaudeConfig(context, [provider], claudePayload);
    await agentConfigs.saveCodexConfig(context, [provider], codexPayload);
    await agentConfigs.saveOpencodeConfig(context, [provider], { providerId: provider.id, model: 'glm-5.3' });

    const claude = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    const claudeEnv = claude.env as Record<string, unknown>;
    assert.equal(claude.autoCompactWindow, undefined);
    assert.equal(claudeEnv.ANTHROPIC_MODEL, 'glm-5.3[1m]');
    assert.equal(claudeEnv.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1048576');
    assert.equal(claudeEnv.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '80');
    assert.equal(claudeEnv.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '131072');
    assert.equal(claudeEnv.CLAUDE_CODE_ATTRIBUTION_HEADER, '0');
    assert.equal(claudeEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC, '1');
    assert.equal(claudeEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, '1');
    assert.equal(claudeEnv.ENABLE_TOOL_SEARCH, 'true');
    assert.equal(claudeEnv.IS_SANDBOX, '1');
    assert.equal(claude.sandbox, undefined);

    await agentConfigs.saveClaudeConfig(context, [provider], {
      ...claudePayload,
      runtimeSettings: { ...claudePayload.runtimeSettings, sandbox: 'disabled' }
    });
    const claudeWithSandboxDisabled = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    assert.equal((claudeWithSandboxDisabled.env as Record<string, unknown>).IS_SANDBOX, '0');
    assert.equal(claudeWithSandboxDisabled.sandbox, undefined);
    await agentConfigs.saveClaudeConfig(context, [provider], claudePayload);

    const codex = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codex.model_context_window, 1_048_576);
    assert.equal(codex.model_auto_compact_token_limit, 838_860);
    assert.equal(codex.service_tier, 'priority');
    assert.equal(codex.sandbox_mode, 'workspace-write');
    assert.equal(codex.approval_policy, 'on-request');
    const agents = await agentConfigs.readAgentsState(context, [provider]);
    assert.equal(agents.claude.autoCompactWindow, 1_048_576);
    assert.equal(agents.claude.runtimeSettings.autoCompactPctOverride, 80);
    assert.equal(agents.claude.maxOutputTokens, 131_072);
    assert.deepEqual(agents.codex.runtimeSettings, codexPayload.runtimeSettings);
    const codexProviders = codex.model_providers as Record<string, Record<string, unknown>>;
    assert.equal(codexProviders['provider-one'].requires_openai_auth, true);
    const codexAuth = JSON.parse(await fs.readFile(codexAuthPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexAuth.OPENAI_API_KEY, 'provider-token');

    await agentConfigs.saveCodexConfig(context, [provider], { ...codexPayload, runtimeSettings: {} });
    const codexWithoutRuntimeSettings = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexWithoutRuntimeSettings.service_tier, undefined);
    assert.equal(codexWithoutRuntimeSettings.sandbox_mode, undefined);
    assert.equal(codexWithoutRuntimeSettings.approval_policy, undefined);
    await agentConfigs.saveCodexConfig(context, [provider], codexPayload);

    const opencode = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, unknown>;
    assert.deepEqual(opencode.compaction, { reserved: 209_716 });
    const opencodeProviders = opencode.provider as Record<string, Record<string, unknown>>;
    const opencodeModels = opencodeProviders['provider-one'].models as Record<string, unknown>;
    assert.deepEqual(opencodeModels['glm-5.3'], {
      name: 'glm-5.3',
      limit: { context: 1_048_576, output: 131_072 }
    });

    claudeEnv.ANTHROPIC_AUTH_TOKEN = 'user-edited-token';
    await fs.writeFile(claudePath, `${JSON.stringify(claude, null, 2)}\n`);
    const providerWithoutKey = { ...provider, apiKey: '' };
    await agentConfigs.saveClaudeConfig(context, [providerWithoutKey], {
      ...claudePayload,
      runtimeSettings: {
        attributionHeader: 'unset',
        disableNonessentialTraffic: 'unset',
        experimentalAgentTeams: 'unset',
        enableToolSearch: 'unset',
        sandbox: 'unset'
      }
    });
    const preserved = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    const preservedEnv = preserved.env as Record<string, unknown>;
    assert.equal(preservedEnv.ANTHROPIC_AUTH_TOKEN, 'user-edited-token');
    assert.equal(preservedEnv.CLAUDE_CODE_ATTRIBUTION_HEADER, undefined);
    assert.equal(preserved.sandbox, undefined);

    await fs.writeFile(codexAuthPath, '{"OPENAI_API_KEY":"user-edited-key"}\n');
    await agentConfigs.saveCodexConfig(context, [providerWithoutKey], codexPayload);
    const codexWithoutKey = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    const codexWithoutKeyProviders = codexWithoutKey.model_providers as Record<string, Record<string, unknown>>;
    assert.equal(codexWithoutKeyProviders['provider-one'].requires_openai_auth, false);
    const codexAuthWithoutKey = JSON.parse(await fs.readFile(codexAuthPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexAuthWithoutKey.OPENAI_API_KEY, undefined);

    const providerWithoutCompact = {
      ...providerWithoutKey,
      models: provider.models.map(({ compactThresholdPercent: _compactThresholdPercent, ...model }) => model)
    };
    await agentConfigs.saveClaudeConfig(context, [providerWithoutCompact], {
      ...claudePayload,
      runtimeSettings: {
        attributionHeader: 'unset',
        disableNonessentialTraffic: 'unset',
        experimentalAgentTeams: 'unset',
        enableToolSearch: 'unset',
        sandbox: 'unset'
      }
    });
    await agentConfigs.saveCodexConfig(context, [providerWithoutCompact], codexPayload);
    await agentConfigs.saveOpencodeConfig(context, [providerWithoutCompact], {
      providerId: provider.id,
      model: 'glm-5.3'
    });
    const claudeWithoutCompact = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    const claudeWithoutCompactEnv = claudeWithoutCompact.env as Record<string, unknown>;
    assert.equal(claudeWithoutCompactEnv.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1048576');
    assert.equal(claudeWithoutCompactEnv.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '80');
    assert.equal(claudeWithoutCompactEnv.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '131072');
    const codexWithoutCompact = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexWithoutCompact.model_context_window, 1_048_576);
    assert.equal(codexWithoutCompact.model_auto_compact_token_limit, undefined);
    const opencodeWithoutCompact = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, unknown>;
    assert.equal(opencodeWithoutCompact.compaction, undefined);

    const providerWithPartialLimits = {
      ...providerWithoutKey,
      models: [
        { id: 'context-only', contextWindow: 200_000 },
        { id: 'output-only', maxOutputTokens: 40_000 }
      ]
    };
    await agentConfigs.saveOpencodeConfig(context, [providerWithPartialLimits], {
      providerId: provider.id,
      model: 'context-only'
    });
    const opencodeWithPartialLimits = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, unknown>;
    const partialProvider = (opencodeWithPartialLimits.provider as Record<string, Record<string, unknown>>)['provider-one'];
    const partialModels = partialProvider.models as Record<string, unknown>;
    assert.deepEqual(partialModels['context-only'], {
      name: 'context-only',
      limit: { context: 200_000 }
    });
    assert.deepEqual(partialModels['output-only'], {
      name: 'output-only',
      limit: { output: 40_000 }
    });

    const providerWithoutLimits = {
      ...providerWithoutKey,
      models: [{ id: 'context-only' }]
    };
    await agentConfigs.saveClaudeConfig(context, [providerWithoutLimits], {
      ...claudePayload,
      models: Object.fromEntries(CLAUDE_MODEL_KEYS.map((key) => [key, 'context-only'])) as SaveClaudePayload['models'],
      runtimeSettings: {
        attributionHeader: 'unset',
        disableNonessentialTraffic: 'unset',
        experimentalAgentTeams: 'unset',
        enableToolSearch: 'unset',
        sandbox: 'unset'
      }
    });
    const claudeWithoutLimits = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    const claudeWithoutLimitsEnv = claudeWithoutLimits.env as Record<string, unknown>;
    assert.equal(claudeWithoutLimitsEnv.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1048576');
    assert.equal(claudeWithoutLimitsEnv.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '80');
    assert.equal(claudeWithoutLimitsEnv.CLAUDE_CODE_MAX_OUTPUT_TOKENS, undefined);
    await agentConfigs.saveOpencodeConfig(context, [providerWithoutLimits], {
      providerId: provider.id,
      model: 'context-only'
    });
    const opencodeWithoutLimits = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, unknown>;
    const providerWithoutLimitsConfig = (opencodeWithoutLimits.provider as Record<string, Record<string, unknown>>)['provider-one'];
    const modelsWithoutLimits = providerWithoutLimitsConfig.models as Record<string, unknown>;
    assert.equal(opencodeWithoutLimits.model, 'provider-one/context-only');
    assert.deepEqual(modelsWithoutLimits['context-only'], { name: 'context-only' });
    assert.equal(opencodeWithoutLimits.compaction, undefined);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

function createFakeVscode(): Record<string, unknown> {
  return {
    Uri: {
      joinPath(base: FakeUri, ...segments: string[]): FakeUri {
        return fakeUri(path.join(base.fsPath, ...segments));
      }
    },
    workspace: {
      fs: {
        async readFile(uri: FakeUri): Promise<Uint8Array> {
          return new Uint8Array(await fs.readFile(uri.fsPath));
        },
        async writeFile(uri: FakeUri, bytes: Uint8Array): Promise<void> {
          await fs.writeFile(uri.fsPath, bytes);
        },
        async createDirectory(uri: FakeUri): Promise<void> {
          await fs.mkdir(uri.fsPath, { recursive: true });
        }
      }
    }
  };
}

function fakeUri(fsPath: string): FakeUri {
  return {
    fsPath,
    toString: () => fsPath
  };
}

function providerFixture(): ProviderConfig {
  return {
    id: 'provider-1',
    key: 'provider-one',
    name: 'provider-one',
    apiKey: 'provider-token',
    proxyMode: 'system',
    customProxyUrl: '',
    sslCheck: false,
    models: [{
      id: 'glm-5.3',
      contextWindow: 1_048_576,
      compactThresholdPercent: 80,
      maxOutputTokens: 131_072
    }],
    claudeBaseUrl: 'https://claude.example/v1',
    codexBaseUrl: 'https://codex.example/v1',
    codexWireApi: 'responses',
    opencodeBaseUrl: 'https://opencode.example/v1',
    opencodeNpm: '@ai-sdk/openai-compatible'
  };
}
