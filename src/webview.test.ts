import assert from 'node:assert/strict';
import test from 'node:test';
import { getManagerHtml } from './webview';

interface FakeElement {
  innerHTML: string;
}

interface WebviewHarness {
  app: FakeElement;
  messages: unknown[];
  sendState(state: unknown): void;
  click(action: string, attributes?: Record<string, string>): void;
}

test('Webview 脚本可解析并渲染 Provider 模型参数台账', () => {
  const harness = createHarness({ activeTab: 'providers', activeAgentTab: 'claude' });
  harness.sendState({
    providers: [providerFixture()],
    agents: {}
  });
  harness.click('provider-edit', { 'data-provider-id': 'provider-1' });

  assert.match(harness.app.innerHTML, /模型 ID/);
  assert.match(harness.app.innerHTML, /上下文窗口/);
  assert.match(harness.app.innerHTML, /压缩阈值 %/);
  assert.match(harness.app.innerHTML, /最大输出/);
  assert.match(harness.app.innerHTML, /1048576/);
  assert.ok(harness.messages.some((message) => isMessageType(message, 'suggestModelParameters')));
});

test('Claude 页面渲染 1M 模型、运行设置和换算预览', () => {
  const harness = createHarness({ activeTab: 'agents', activeAgentTab: 'claude' });
  harness.sendState({
    providers: [providerFixture()],
    agents: {
      claude: {
        ...configPathFixture('/tmp/claude.json'),
        selectedProviderId: 'provider-1',
        baseUrl: 'https://claude.example/v1',
        authToken: 'token',
        hasAuthToken: true,
        models: {
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5.3[1m]',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.3[1m]',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.3[1m]',
          ANTHROPIC_MODEL: 'glm-5.3[1m]',
          ANTHROPIC_REASONING_MODEL: 'glm-5.3[1m]'
        },
        autoCompactWindow: 838860,
        runtimeSettings: {
          attributionHeader: 'unset',
          disableNonessentialTraffic: 'unset',
          experimentalAgentTeams: 'unset',
          enableToolSearch: 'unset',
          sandbox: 'unset'
        },
        managedPaths: []
      },
      codex: {},
      opencode: {}
    }
  });

  assert.match(harness.app.innerHTML, /glm-5\.3 \[1M\]/);
  assert.match(harness.app.innerHTML, /运行设置/);
  assert.match(harness.app.innerHTML, /CLAUDE_AUTOCOMPACT_PCT_OVERRIDE/);
  assert.match(harness.app.innerHTML, /autoCompactWindow/);
  assert.match(harness.app.innerHTML, /838860/);
});

function createHarness(restoredState: Record<string, unknown>): WebviewHarness {
  const html = getManagerHtml({ cspSource: 'vscode-resource:' } as never);
  const scriptMatch = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '应生成 Webview 脚本');

  const app: FakeElement = { innerHTML: '' };
  const tabs: FakeElement = { innerHTML: '' };
  const windowListeners: Record<string, Array<(event: { data: unknown }) => void>> = {};
  const documentListeners: Record<string, Array<(event: unknown) => void>> = {};
  const messages: unknown[] = [];
  const fakeWindow = {
    addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
      (windowListeners[type] ||= []).push(listener);
    }
  };
  const fakeDocument = {
    addEventListener(type: string, listener: (event: unknown) => void): void {
      (documentListeners[type] ||= []).push(listener);
    },
    getElementById(id: string): FakeElement | null {
      return id === 'app' ? app : id === 'tabs' ? tabs : null;
    },
    querySelectorAll(): unknown[] {
      return [];
    },
    querySelector(): null {
      return null;
    }
  };
  const acquire = () => ({
    getState: () => restoredState,
    setState: () => undefined,
    postMessage: (message: unknown) => messages.push(message)
  });
  const immediateTimeout = (callback: () => void): number => {
    callback();
    return 0;
  };

  const execute = new Function('acquireVsCodeApi', 'window', 'document', 'setTimeout', scriptMatch[1]);
  execute(acquire, fakeWindow, fakeDocument, immediateTimeout);

  return {
    app,
    messages,
    sendState(state: unknown): void {
      for (const listener of windowListeners.message || []) {
        listener({ data: { type: 'state', state } });
      }
    },
    click(action: string, attributes: Record<string, string> = {}): void {
      const button = {
        getAttribute(name: string): string | null {
          return name === 'data-action' ? action : attributes[name] || null;
        }
      };
      const target = {
        closest(selector: string): unknown {
          return selector === '[data-action]' ? button : null;
        }
      };
      for (const listener of documentListeners.click || []) {
        listener({ target });
      }
    }
  };
}

function providerFixture(): Record<string, unknown> {
  return {
    id: 'provider-1',
    key: 'provider-one',
    name: 'provider-one',
    apiKey: 'token',
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

function configPathFixture(filePath: string): Record<string, unknown> {
  return {
    path: filePath,
    defaultPath: filePath,
    customPath: '',
    usesDefaultPath: true,
    exists: true
  };
}

function isMessageType(message: unknown, type: string): boolean {
  return Boolean(message && typeof message === 'object' && 'type' in message && (message as { type?: unknown }).type === type);
}
