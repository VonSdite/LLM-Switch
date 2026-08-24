import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import Module from 'node:module';
import test from 'node:test';
import * as TOML from '@iarna/toml';
import { ProviderConfig, SaveClaudePayload } from './types';

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

    await agentConfigs.saveClaudeConfig(context, [provider], claudePayload);
    await agentConfigs.saveCodexConfig(context, [provider], { providerId: provider.id, model: 'glm-5.3' });
    await agentConfigs.saveOpencodeConfig(context, [provider], { providerId: provider.id, model: 'glm-5.3' });

    const claude = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    const claudeEnv = claude.env as Record<string, unknown>;
    assert.equal(claude.autoCompactWindow, 838_860);
    assert.equal(claudeEnv.ANTHROPIC_MODEL, 'glm-5.3[1m]');
    assert.equal(claudeEnv.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '95');
    assert.equal(claudeEnv.CLAUDE_CODE_ATTRIBUTION_HEADER, '0');
    assert.equal(claudeEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC, '1');
    assert.equal(claudeEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, '1');
    assert.equal(claudeEnv.ENABLE_TOOL_SEARCH, 'true');
    assert.deepEqual(claude.sandbox, { enabled: true });

    const codex = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codex.model_context_window, 1_048_576);
    assert.equal(codex.model_auto_compact_token_limit, 838_860);
    const codexProviders = codex.model_providers as Record<string, Record<string, unknown>>;
    assert.equal(codexProviders['provider-one'].requires_openai_auth, true);
    const codexAuth = JSON.parse(await fs.readFile(codexAuthPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexAuth.OPENAI_API_KEY, 'provider-token');

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
    await agentConfigs.saveCodexConfig(context, [providerWithoutKey], {
      providerId: provider.id,
      model: 'glm-5.3'
    });
    const codexWithoutKey = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    const codexWithoutKeyProviders = codexWithoutKey.model_providers as Record<string, Record<string, unknown>>;
    assert.equal(codexWithoutKeyProviders['provider-one'].requires_openai_auth, false);
    const preservedCodexAuth = JSON.parse(await fs.readFile(codexAuthPath, 'utf8')) as Record<string, unknown>;
    assert.equal(preservedCodexAuth.OPENAI_API_KEY, 'user-edited-key');

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
    await agentConfigs.saveCodexConfig(context, [providerWithoutCompact], {
      providerId: provider.id,
      model: 'glm-5.3'
    });
    await agentConfigs.saveOpencodeConfig(context, [providerWithoutCompact], {
      providerId: provider.id,
      model: 'glm-5.3'
    });
    const claudeWithoutCompact = JSON.parse(await fs.readFile(claudePath, 'utf8')) as Record<string, unknown>;
    assert.equal(claudeWithoutCompact.autoCompactWindow, undefined);
    const codexWithoutCompact = TOML.parse(await fs.readFile(codexPath, 'utf8')) as Record<string, unknown>;
    assert.equal(codexWithoutCompact.model_context_window, 1_048_576);
    assert.equal(codexWithoutCompact.model_auto_compact_token_limit, undefined);
    const opencodeWithoutCompact = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, unknown>;
    assert.equal(opencodeWithoutCompact.compaction, undefined);
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
