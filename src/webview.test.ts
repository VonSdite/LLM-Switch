import assert from 'node:assert/strict';
import test from 'node:test';
import { getManagerHtml } from './webview';

interface FakeElement {
  innerHTML: string;
  checked?: boolean;
  type?: string;
  value?: string;
  focus?(): void;
  setAttribute?(name: string, value: string): void;
}

interface WebviewHarness {
  html: string;
  app: FakeElement;
  messages: unknown[];
  providerModalScroll(): number;
  sendMessage(message: unknown): void;
  sendState(state: unknown): void;
  setProviderModalScroll(scrollTop: number): void;
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
  assert.match(harness.app.innerHTML, /压缩阈值/);
  assert.match(harness.app.innerHTML, /最大输出/);
  assert.match(harness.app.innerHTML, /1048576/);
  assert.match(harness.app.innerHTML, /data-model-candidate-menu="contextWindow"/);
  assert.match(harness.app.innerHTML, /data-model-candidate-menu="compactThresholdPercent"/);
  assert.match(harness.app.innerHTML, /data-model-candidate-menu="maxOutputTokens"/);
  assert.doesNotMatch(harness.app.innerHTML, /model-suggestion-strip/);

  const request = harness.messages.find((message): message is { type: string; payload: { requestId: string } } => (
    isMessageType(message, 'suggestModelParameters')
      && typeof (message as { payload?: { requestId?: unknown } }).payload?.requestId === 'string'
  ));
  assert.ok(request);
  harness.sendMessage({
    type: 'modelParameterSuggestions',
    requestId: request.payload.requestId,
    suggestions: {
      sourceLabel: '测试模型参数来源',
      contextWindow: [{ value: 777_777, label: '测试上下文候选' }],
      compactThresholdPercent: [{ value: 60, label: '测试压缩候选' }],
      maxOutputTokens: [{ value: 66_666, label: '测试输出候选' }]
    }
  });
  harness.setProviderModalScroll(180);
  harness.click('provider-model-add');

  assert.equal(harness.providerModalScroll(), 180);
  assert.match(harness.app.innerHTML, /777777/);
  assert.match(harness.app.innerHTML, /id="providerModel_1_compactThresholdPercent"[^>]*value="60"/);
  assert.match(harness.app.innerHTML, /model-candidate-option/);
  assert.doesNotMatch(harness.app.innerHTML, /测试模型参数来源/);
  assert.doesNotMatch(harness.app.innerHTML, /测试上下文候选/);
  assert.doesNotMatch(harness.app.innerHTML, /批量编辑模型 ID/);
  assert.doesNotMatch(harness.app.innerHTML, /provider-model-batch/);
  assert.match(harness.app.innerHTML, /class="modal provider-modal"/);
  assert.match(harness.html, /\.provider-modal\s*\{[^}]*width: 820px;[^}]*resize: both;/);

  harness.setProviderModalScroll(240);
  harness.click('provider-model-remove', { 'data-model-index': '1' });
  assert.equal(harness.providerModalScroll(), 240);
});

test('保存 Provider 时忽略空模型 ID 行', () => {
  const provider = {
    ...providerFixture(),
    models: [
      {
        id: 'glm-5.3',
        contextWindow: 1_048_576,
        compactThresholdPercent: 60,
        maxOutputTokens: 131_072
      },
      { id: '', contextWindow: 200_000, compactThresholdPercent: 60, maxOutputTokens: 32_000 },
      { id: '   ', contextWindow: 128_000 }
    ]
  };
  const harness = createHarness({ activeTab: 'providers', activeAgentTab: 'claude' });
  harness.sendState({
    providers: [provider],
    agents: {}
  });
  harness.click('provider-edit', { 'data-provider-id': 'provider-1' });
  harness.click('provider-save');

  const saveProvider = harness.messages.find((message): message is { type: string; payload: { models: unknown[] } } => {
    const payload = (message as { payload?: unknown }).payload;
    return isMessageType(message, 'saveProvider')
      && Boolean(payload && typeof payload === 'object' && Array.isArray((payload as { models?: unknown }).models));
  });
  assert.ok(saveProvider);
  assert.deepEqual(saveProvider.payload.models, [{
    id: 'glm-5.3',
    contextWindow: 1_048_576,
    compactThresholdPercent: 60,
    maxOutputTokens: 131_072
  }]);
  assert.equal(harness.messages.some((message) => (
    isMessageType(message, 'toast')
      && String((message as { payload?: { message?: unknown } }).payload?.message || '').includes('模型 ID 不能为空')
  )), false);
});

test('Provider 模型输出大于压缩预留空间时不显示提示', () => {
  const provider = {
    ...providerFixture(),
    models: [{
      id: 'gpt-5.5',
      contextWindow: 372_000,
      compactThresholdPercent: 85,
      maxOutputTokens: 128_000
    }]
  };
  const harness = createHarness({ activeTab: 'providers', activeAgentTab: 'claude' });
  harness.sendState({
    providers: [provider],
    agents: {}
  });
  harness.click('provider-edit', { 'data-provider-id': 'provider-1' });

  assert.doesNotMatch(harness.app.innerHTML, /压缩阈值预留空间小于最大输出/);
  assert.doesNotMatch(harness.app.innerHTML, /has-warning/);
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
        autoCompactWindow: 1_048_576,
        maxOutputTokens: 64_000,
        runtimeSettings: {
          effortLevel: 'max',
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
  assert.match(harness.app.innerHTML, /CLAUDE_CODE_AUTO_COMPACT_WINDOW/);
  assert.match(harness.app.innerHTML, /CLAUDE_CODE_MAX_OUTPUT_TOKENS/);
  assert.match(harness.app.innerHTML, /1048576/);
  assert.match(harness.app.innerHTML, /64000/);
  assert.doesNotMatch(harness.app.innerHTML, /131072/);
  assert.match(harness.app.innerHTML, /class="help-icon" data-action="help-toggle"/);
  assert.match(harness.app.innerHTML, /data-help-popover="1" role="tooltip" hidden/);
  assert.doesNotMatch(harness.app.innerHTML, /class="help-icon" title=/);
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeEffortLevel'), 'max');
  assert.equal(optionLabelsByValue(harness.app.innerHTML, 'claudeEffortLevel').max, 'max');
  assert.match(harness.app.innerHTML, /<span>非必要流量<\/span>/);
  assert.doesNotMatch(harness.app.innerHTML, /<span>禁用非必要流量<\/span>/);
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeAttributionHeader'), 'unset');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeDisableNonessentialTraffic'), 'unset');
  assert.deepEqual(optionLabelsByValue(harness.app.innerHTML, 'claudeDisableNonessentialTraffic'), {
    unset: '不设置',
    disabled: '允许',
    enabled: '禁用'
  });
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeExperimentalAgentTeams'), 'unset');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeEnableToolSearch'), 'unset');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'claudeSandbox'), 'unset');
  assert.match(harness.app.innerHTML, /沙箱环境/);
  assert.match(harness.app.innerHTML, /env\.IS_SANDBOX/);
  assert.doesNotMatch(harness.app.innerHTML, /sandbox\.enabled/);
});

test('Codex 页面支持 service tier、reasoning effort、沙箱和审批策略', () => {
  const harness = createHarness({ activeTab: 'agents', activeAgentTab: 'codex' });
  harness.sendState({
    providers: [providerFixture()],
    agents: {
      claude: {},
      codex: codexAgentFixture({}),
      opencode: {}
    }
  });

  assert.match(harness.app.innerHTML, /Service tier/);
  assert.match(harness.app.innerHTML, /Reasoning effort/);
  assert.match(harness.app.innerHTML, /Sandbox mode/);
  assert.match(harness.app.innerHTML, /Approval policy/);
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexServiceTier'), '');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexModelReasoningEffort'), '');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexSandboxMode'), '');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexApprovalPolicy'), '');

  harness.sendState({
    providers: [providerFixture()],
    agents: {
      claude: {},
      codex: codexAgentFixture({
        serviceTier: 'priority',
        modelReasoningEffort: 'max',
        sandboxMode: 'workspace-write',
        approvalPolicy: 'on-request'
      }),
      opencode: {}
    }
  });

  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexServiceTier'), 'priority');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexModelReasoningEffort'), 'max');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexSandboxMode'), 'workspace-write');
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'codexApprovalPolicy'), 'on-request');
  assert.match(harness.app.innerHTML, /service_tier/);
  assert.match(harness.app.innerHTML, /<ul>/);
  assert.match(harness.app.innerHTML, /auto：使用项目配置的服务档位/);
  assert.match(harness.app.innerHTML, /default：标准处理档位/);
  assert.match(harness.app.innerHTML, /flex：弹性处理/);
  assert.match(harness.app.innerHTML, /priority：优先处理（Fast）/);
  assert.match(harness.app.innerHTML, /实际可用档位取决于模型和上游 Provider/);
  assert.match(harness.app.innerHTML, /sandbox_mode/);
  assert.match(harness.app.innerHTML, /approval_policy/);
  assert.match(harness.app.innerHTML, /model_reasoning_effort/);
});

test('opencode 模型参数留空时仍可保存', () => {
  const harness = createHarness({ activeTab: 'agents', activeAgentTab: 'opencode' });
  const provider = {
    ...providerFixture(),
    models: [
      { id: 'private-model' },
      { id: 'context-model', contextWindow: 200_000 }
    ]
  };
  harness.sendState({
    providers: [provider],
    agents: {
      claude: {},
      codex: {},
      opencode: {
        ...configPathFixture('/tmp/opencode.json'),
        selectedProviderId: 'provider-1',
        providerKey: 'provider-one',
        model: 'private-model',
        providerModelCount: 1,
        runtimeSettings: {
          reasoningEffort: 'none'
        },
        managedPaths: []
      }
    }
  });

  assert.doesNotMatch(harness.app.innerHTML, /需要同时配置上下文窗口和最大输出/);
  assert.match(harness.app.innerHTML, /<button data-action="save-opencode" >保存<\/button>/);
  assert.match(harness.app.innerHTML, /1 个模型/);
  assert.match(harness.app.innerHTML, /2 个模型/);
  assert.equal(selectedOptionValue(harness.app.innerHTML, 'opencodeReasoningEffort'), 'none');
  assert.equal(optionLabelsByValue(harness.app.innerHTML, 'opencodeReasoningEffort').max, 'max');
  assert.match(harness.app.innerHTML, /options\.reasoningEffort/);
});

function createHarness(restoredState: Record<string, unknown>): WebviewHarness {
  const html = getManagerHtml({ cspSource: 'vscode-resource:' } as never);
  const scriptMatch = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '应生成 Webview 脚本');

  let providerModalBody: { scrollTop: number } | null = null;
  let appHtml = '';
  const app: FakeElement = {
    get innerHTML(): string {
      return appHtml;
    },
    set innerHTML(value: string) {
      appHtml = value;
      providerModalBody = value.includes('class="modal provider-modal"') ? { scrollTop: 0 } : null;
    }
  };
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
      if (id === 'app') {
        return app;
      }
      if (id === 'tabs') {
        return tabs;
      }
      return formElementById(appHtml, id);
    },
    querySelectorAll(): unknown[] {
      return [];
    },
    querySelector(selector: string): { scrollTop: number } | null {
      return selector === '.provider-modal .modal-body' ? providerModalBody : null;
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
    html,
    app,
    messages,
    providerModalScroll(): number {
      assert.ok(providerModalBody, '应渲染 Provider 对话框正文');
      return providerModalBody.scrollTop;
    },
    sendMessage(message: unknown): void {
      for (const listener of windowListeners.message || []) {
        listener({ data: message });
      }
    },
    sendState(state: unknown): void {
      for (const listener of windowListeners.message || []) {
        listener({ data: { type: 'state', state } });
      }
    },
    setProviderModalScroll(scrollTop: number): void {
      assert.ok(providerModalBody, '应渲染 Provider 对话框正文');
      providerModalBody.scrollTop = scrollTop;
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

function formElementById(html: string, id: string): FakeElement | null {
  const input = elementTagById(html, 'input', id);
  if (input) {
    return {
      innerHTML: '',
      checked: /\schecked(?:\s|>|$)/.test(input),
      type: attributeValue(input, 'type') || 'text',
      value: attributeValue(input, 'value'),
      focus: () => undefined,
      setAttribute: () => undefined
    };
  }

  const select = html.match(new RegExp(`<select\\b[^>]*id="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<\\/select>`));
  if (select) {
    const selected = select[1].match(/<option\b[^>]*\sselected\b[^>]*>/)
      || select[1].match(/<option\b[^>]*>/);
    return {
      innerHTML: select[1],
      value: selected ? attributeValue(selected[0], 'value') : '',
      focus: () => undefined,
      setAttribute: () => undefined
    };
  }

  return null;
}

function elementTagById(html: string, tagName: string, id: string): string | null {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*id="${escapeRegExp(id)}"[^>]*>`));
  return match ? match[0] : null;
}

function attributeValue(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`));
  return match ? decodeHtmlAttribute(match[1]) : '';
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&#10;/g, '\n')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      compactThresholdPercent: 60,
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

function codexAgentFixture(runtimeSettings: Record<string, unknown>): Record<string, unknown> {
  return {
    ...configPathFixture('/tmp/codex.toml'),
    selectedProviderId: 'provider-1',
    modelProvider: 'provider-one',
    providerName: 'provider-one',
    providerBaseUrl: 'https://codex.example/v1',
    wireApi: 'responses',
    requiresOpenAiAuth: true,
    auth: {
      ...configPathFixture('/tmp/auth.json'),
      managedPaths: []
    },
    openAiApiKey: 'token',
    hasOpenAiApiKey: true,
    model: 'glm-5.3',
    modelContextWindow: 1_048_576,
    modelAutoCompactTokenLimit: 838_860,
    runtimeSettings,
    managedPaths: []
  };
}

function isMessageType(message: unknown, type: string): boolean {
  return Boolean(message && typeof message === 'object' && 'type' in message && (message as { type?: unknown }).type === type);
}

function selectedOptionValue(html: string, selectId: string): string {
  const select = html.match(new RegExp(`<select[^>]*id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`));
  assert.ok(select, `应渲染 ${selectId}`);
  const option = select[1].match(/<option value="([^"]*)"[^>]*selected/);
  assert.ok(option, `${selectId} 应有选中项`);
  return option[1];
}

function optionLabelsByValue(html: string, selectId: string): Record<string, string> {
  const select = html.match(new RegExp(`<select[^>]*id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`));
  assert.ok(select, `应渲染 ${selectId}`);
  return Object.fromEntries(Array.from(
    select[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g),
    (option) => [option[1], option[2]]
  ));
}
