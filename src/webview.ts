import * as vscode from 'vscode';

export function getManagerHtml(webview: vscode.Webview): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>LLM-Switch</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font: 13px/1.45 var(--vscode-font-family);
    }
    button,
    input,
    select,
    textarea {
      font: inherit;
    }
    button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      min-height: 28px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    button.danger {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border-color: var(--vscode-inputValidation-errorBorder);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    input,
    select,
    textarea {
      width: 100%;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      padding: 6px 8px;
      min-height: 30px;
    }
    textarea {
      min-height: 112px;
      resize: vertical;
      white-space: pre;
    }
    label {
      display: grid;
      gap: 5px;
      min-width: 0;
    }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto auto 1fr;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px 8px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }
    .brand {
      min-width: 0;
    }
    .brand h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 650;
      line-height: 1.2;
    }
    .brand p {
      margin: 2px 0 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .tabs {
      display: flex;
      gap: 2px;
      padding: 8px 10px 0;
      overflow-x: auto;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }
    .tab {
      border: 0;
      border-bottom: 2px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      padding: 8px 10px;
      white-space: nowrap;
      min-height: 34px;
    }
    .tab.active {
      color: var(--vscode-foreground);
      border-bottom-color: var(--vscode-focusBorder);
      background: var(--vscode-list-activeSelectionBackground);
    }
    main {
      min-width: 0;
      padding: 12px;
    }
    .banner {
      display: none;
      margin: 0 12px 10px;
      padding: 8px 10px;
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      background: var(--vscode-inputValidation-infoBackground);
      color: var(--vscode-inputValidation-infoForeground);
      border-radius: 4px;
    }
    .banner.visible {
      display: block;
    }
    .banner.error {
      border-color: var(--vscode-inputValidation-errorBorder);
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }
    .split {
      display: grid;
      grid-template-columns: minmax(170px, 0.9fr) minmax(280px, 1.6fr);
      gap: 12px;
      align-items: start;
    }
    .provider-list {
      display: grid;
      gap: 8px;
    }
    .provider-card {
      display: grid;
      gap: 5px;
      width: 100%;
      text-align: left;
      border: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      color: var(--vscode-foreground);
      border-radius: 6px;
      padding: 9px;
    }
    .provider-card.active {
      outline: 1px solid var(--vscode-focusBorder);
      background: var(--vscode-list-activeSelectionBackground);
    }
    .provider-name {
      font-weight: 650;
      overflow-wrap: anywhere;
    }
    .muted {
      color: var(--vscode-descriptionForeground);
    }
    .small {
      font-size: 12px;
    }
    .form {
      display: grid;
      gap: 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      background: var(--vscode-editor-background);
    }
    .section {
      display: grid;
      gap: 10px;
    }
    .section-title {
      margin: 0;
      font-size: 13px;
      font-weight: 650;
      color: var(--vscode-foreground);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 20px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
      font-size: 11px;
      line-height: 1.3;
    }
    .badge.off {
      background: transparent;
      color: var(--vscode-descriptionForeground);
      border-color: var(--vscode-panel-border);
    }
    .path-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .path {
      overflow-wrap: anywhere;
      padding: 7px 9px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-editor-background);
    }
    .notice {
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 12px;
    }
    .agent-panel {
      display: grid;
      gap: 12px;
      max-width: 860px;
    }
    .model-grid {
      display: grid;
      gap: 9px;
    }
    .model-row {
      display: grid;
      grid-template-columns: minmax(230px, 0.85fr) minmax(220px, 1fr);
      gap: 10px;
      align-items: center;
    }
    .summary {
      display: grid;
      gap: 4px;
      color: var(--vscode-descriptionForeground);
      border-left: 2px solid var(--vscode-focusBorder);
      padding-left: 10px;
      margin-bottom: 4px;
    }
    .empty {
      border: 1px dashed var(--vscode-panel-border);
      border-radius: 6px;
      padding: 14px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
    }
    @media (max-width: 760px) {
      .split,
      .grid,
      .model-row,
      .path-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <h1>LLM-Switch</h1>
        <p>统一管理 AI Provider 与 Agent 模型</p>
      </div>
      <button class="secondary" data-action="refresh" title="刷新配置">刷新</button>
    </header>
    <nav class="tabs" id="tabs"></nav>
    <div class="banner" id="banner"></div>
    <main id="app">
      <div class="empty">Loading...</div>
    </main>
  </div>

  <script nonce="${nonce}">
    (function () {
      const vscode = acquireVsCodeApi();
      const tabs = [
        ['providers', 'Providers'],
        ['claude', 'Claude'],
        ['codex', 'Codex'],
        ['opencode', 'opencode']
      ];
      const claudeKeys = [
        'ANTHROPIC_DEFAULT_HAIKU_MODEL',
        'ANTHROPIC_DEFAULT_OPUS_MODEL',
        'ANTHROPIC_DEFAULT_SONNET_MODEL',
        'ANTHROPIC_MODEL',
        'ANTHROPIC_REASONING_MODEL'
      ];
      const restored = vscode.getState() || {};
      let activeTab = restored.activeTab || 'providers';
      let editingProviderId = restored.editingProviderId || '__new';
      let state = { providers: [], agents: null };
      let drafts = {
        claudeProviderId: null,
        codexProviderId: null,
        opencodeProviderId: null
      };
      let bannerTimer = null;

      window.addEventListener('message', function (event) {
        const message = event.data;
        if (message.type === 'state') {
          state = message.state;
          if (editingProviderId !== '__new' && !state.providers.some(function (provider) { return provider.id === editingProviderId; })) {
            editingProviderId = state.providers[0] ? state.providers[0].id : '__new';
          }
          render();
        }
        if (message.type === 'notice') {
          showBanner(message.message, false);
        }
        if (message.type === 'error') {
          showBanner(message.message, true);
        }
      });

      document.addEventListener('click', function (event) {
        const button = event.target.closest('[data-action]');
        if (!button) {
          return;
        }
        const action = button.getAttribute('data-action');
        if (action === 'tab') {
          activeTab = button.getAttribute('data-tab') || 'providers';
          render();
        }
        if (action === 'refresh') {
          post('refresh', {});
        }
        if (action === 'provider-new') {
          editingProviderId = '__new';
          render();
        }
        if (action === 'provider-edit') {
          editingProviderId = button.getAttribute('data-provider-id') || '__new';
          render();
        }
        if (action === 'provider-save') {
          post('saveProvider', collectProviderForm());
        }
        if (action === 'provider-delete') {
          const id = button.getAttribute('data-provider-id');
          if (id && confirm('删除这个 Provider？Agent 配置文件不会自动回滚。')) {
            post('deleteProvider', { id: id });
          }
        }
        if (action === 'open-config') {
          post('openConfig', { agent: button.getAttribute('data-agent') });
        }
        if (action === 'save-claude') {
          saveClaude();
        }
        if (action === 'save-codex') {
          saveCodex();
        }
        if (action === 'save-opencode') {
          saveOpencode();
        }
      });

      document.addEventListener('change', function (event) {
        const target = event.target;
        if (!target || !target.id) {
          return;
        }
        if (target.id === 'claudeProviderSelect') {
          drafts.claudeProviderId = target.value;
          render();
        }
        if (target.id === 'codexProviderSelect') {
          drafts.codexProviderId = target.value;
          render();
        }
        if (target.id === 'opencodeProviderSelect') {
          drafts.opencodeProviderId = target.value;
          render();
        }
      });

      post('ready', {});

      function render() {
        vscode.setState({ activeTab: activeTab, editingProviderId: editingProviderId });
        renderTabs();
        const app = document.getElementById('app');
        if (!state.agents) {
          app.innerHTML = '<div class="empty">Loading...</div>';
          return;
        }
        if (activeTab === 'providers') {
          app.innerHTML = renderProviders();
        } else if (activeTab === 'claude') {
          app.innerHTML = renderClaude();
        } else if (activeTab === 'codex') {
          app.innerHTML = renderCodex();
        } else {
          app.innerHTML = renderOpencode();
        }
      }

      function renderTabs() {
        const element = document.getElementById('tabs');
        element.innerHTML = tabs.map(function (tab) {
          const id = tab[0];
          const label = tab[1];
          return '<button class="tab ' + (activeTab === id ? 'active' : '') + '" data-action="tab" data-tab="' + h(id) + '">' + h(label) + '</button>';
        }).join('');
      }

      function renderProviders() {
        const selected = getEditingProvider();
        const list = state.providers.length
          ? state.providers.map(function (provider) {
              return '<button class="provider-card ' + (selected.id === provider.id ? 'active' : '') + '" data-action="provider-edit" data-provider-id="' + h(provider.id) + '">' +
                '<span class="provider-name">' + h(provider.name) + '</span>' +
                '<span class="muted small">key: ' + h(provider.key) + '</span>' +
                '<span class="badges">' + renderAgentBadges(provider) + '</span>' +
              '</button>';
            }).join('')
          : '<div class="empty">还没有 Provider。</div>';

        return '<div class="split">' +
          '<aside class="provider-list">' +
            '<button data-action="provider-new">新增 Provider</button>' +
            list +
          '</aside>' +
          '<section class="form">' +
            '<div class="section">' +
              '<h2 class="section-title">' + (selected.id ? '编辑 Provider' : '新增 Provider') + '</h2>' +
              '<div class="grid">' +
                field('Provider 名称 *', '<input id="providerName" value="' + attr(selected.name) + '" placeholder="例如 proxy">') +
                field('Provider key', '<input value="' + attr(selected.key || '保存时自动生成') + '" disabled>') +
              '</div>' +
              field('API key（可留空）', '<input id="providerApiKey" type="password" value="' + attr(selected.apiKey) + '" autocomplete="off">') +
            '</div>' +
            '<div class="section">' +
              '<h2 class="section-title">网络</h2>' +
              '<div class="grid">' +
                field('代理模式', select('providerProxyMode', [['direct', '直连模式'], ['system', '系统代理模式'], ['custom', '自定义代理']], selected.proxyMode)) +
                field('自定义代理地址', '<input id="providerCustomProxyUrl" value="' + attr(selected.customProxyUrl) + '" placeholder="http://127.0.0.1:7890">') +
              '</div>' +
              '<label><span>SSL 证书校验</span><span><input id="providerSslCheck" type="checkbox" style="width:auto; min-height:auto;" ' + (selected.sslCheck ? 'checked' : '') + '> check SSL certificate</span></label>' +
            '</div>' +
            '<div class="section">' +
              '<h2 class="section-title">模型列表</h2>' +
              '<textarea id="providerModels" placeholder="每行一个模型，例如&#10;aliyun/glm-5&#10;cpa/gpt-5.5">' + h(selected.models.join('\\n')) + '</textarea>' +
            '</div>' +
            '<div class="section">' +
              '<h2 class="section-title">Agent API 地址</h2>' +
              field('Claude API 地址', '<input id="providerClaudeBaseUrl" value="' + attr(selected.claudeBaseUrl) + '" placeholder="http://host:port">') +
              '<div class="grid">' +
                field('Codex API 地址', '<input id="providerCodexBaseUrl" value="' + attr(selected.codexBaseUrl) + '" placeholder="http://host:port/v1">') +
                field('Codex wire_api', select('providerCodexWireApi', [['responses', 'responses'], ['chat', 'chat']], selected.codexWireApi)) +
              '</div>' +
              field('opencode API 地址', '<input id="providerOpencodeBaseUrl" value="' + attr(selected.opencodeBaseUrl) + '" placeholder="http://host:port/v1">') +
            '</div>' +
            '<div class="actions">' +
              '<button data-action="provider-save">保存 Provider</button>' +
              (selected.id ? '<button class="danger" data-action="provider-delete" data-provider-id="' + h(selected.id) + '">删除</button>' : '') +
            '</div>' +
          '</section>' +
        '</div>';
      }

      function renderClaude() {
        const agent = state.agents.claude;
        const providers = providersFor('claude');
        const selectedId = drafts.claudeProviderId !== null ? drafts.claudeProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        let notices = renderParseNotice(agent) + renderClaudeMismatch(agent);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderAgentPath('claude', 'Claude settings.json', agent) +
          notices +
          renderProviderSelect('claudeProviderSelect', providers, selectedId, '选择 Claude Provider') +
          '<div class="summary">' +
            '<span>当前 baseURL: ' + h(agent.baseUrl || '未设置') + '</span>' +
            '<span>当前 token: ' + h(agent.hasAuthToken ? '已设置' : '未设置') + '</span>' +
            (provider ? '<span>保存后写入 Provider: ' + h(provider.name) + ' / ' + h(provider.claudeBaseUrl) + '</span>' : '') +
          '</div>' +
          '<div class="form">' +
            '<h2 class="section-title">Claude 模型环境变量</h2>' +
            '<div class="model-grid">' + claudeKeys.map(function (key) {
              return '<div class="model-row">' +
                '<div><strong>' + h(key) + '</strong></div>' +
                modelSelect('claudeModel_' + key, provider, currentModelForSelection(provider, selectedId, agent.selectedProviderId, agent.models[key]), disabled) +
              '</div>';
            }).join('') + '</div>' +
            '<div class="actions"><button data-action="save-claude" ' + (disabled ? 'disabled' : '') + '>应用到 Claude</button></div>' +
          '</div>' +
        '</section>';
      }

      function renderCodex() {
        const agent = state.agents.codex;
        const providers = providersFor('codex');
        const selectedId = drafts.codexProviderId !== null ? drafts.codexProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        let notices = renderParseNotice(agent) + renderProviderMismatch('Codex', agent.modelProvider, agent.providerBaseUrl, agent.selectedProviderId);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderAgentPath('codex', 'Codex config.toml', agent) +
          notices +
          renderProviderSelect('codexProviderSelect', providers, selectedId, '选择 Codex Provider') +
          '<div class="summary">' +
            '<span>当前 model_provider: ' + h(agent.modelProvider || '未设置') + '</span>' +
            '<span>当前 provider base_url: ' + h(agent.providerBaseUrl || '未设置') + '</span>' +
            '<span>当前 wire_api: ' + h(agent.wireApi || '未设置') + '</span>' +
            (provider ? '<span>保存后写入 [' + h('model_providers.' + provider.key) + ']，wire_api=' + h(provider.codexWireApi) + '</span>' : '') +
          '</div>' +
          '<div class="form">' +
            '<h2 class="section-title">Codex 模型</h2>' +
            field('model', modelSelect('codexModel', provider, currentModelForSelection(provider, selectedId, agent.selectedProviderId, agent.model), disabled)) +
            '<div class="actions"><button data-action="save-codex" ' + (disabled ? 'disabled' : '') + '>应用到 Codex</button></div>' +
          '</div>' +
        '</section>';
      }

      function renderOpencode() {
        const agent = state.agents.opencode;
        const providers = providersFor('opencode');
        const selectedId = drafts.opencodeProviderId !== null ? drafts.opencodeProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        let notices = renderParseNotice(agent) + renderProviderMismatch('opencode', agent.providerKey, agent.providerBaseUrl, agent.selectedProviderId);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderAgentPath('opencode', 'opencode.json', agent) +
          notices +
          renderProviderSelect('opencodeProviderSelect', providers, selectedId, '选择 opencode Provider') +
          '<div class="summary">' +
            '<span>当前 provider key: ' + h(agent.providerKey || '未设置') + '</span>' +
            '<span>当前 provider baseURL: ' + h(agent.providerBaseUrl || '未设置') + '</span>' +
            (provider ? '<span>保存后写入 provider.' + h(provider.key) + '，model=' + h(provider.key) + '/&lt;model&gt;</span>' : '') +
          '</div>' +
          '<div class="form">' +
            '<h2 class="section-title">opencode 模型</h2>' +
            field('model', modelSelect('opencodeModel', provider, currentModelForSelection(provider, selectedId, agent.selectedProviderId, agent.model), disabled)) +
            '<div class="actions"><button data-action="save-opencode" ' + (disabled ? 'disabled' : '') + '>应用到 opencode</button></div>' +
          '</div>' +
        '</section>';
      }

      function renderAgentPath(agentName, label, agent) {
        return '<div class="path-row">' +
          '<div class="path"><strong>' + h(label) + '</strong><br><span class="muted small">' + h(agent.path) + '</span></div>' +
          '<button class="secondary" data-action="open-config" data-agent="' + h(agentName) + '">打开配置</button>' +
        '</div>' +
        (!agent.exists ? '<div class="notice">配置文件尚不存在，保存或打开配置时会自动创建。</div>' : '');
      }

      function renderProviderSelect(id, providers, selectedId, placeholder) {
        if (!providers.length) {
          return '<div class="empty">没有可用 Provider。请先在 Providers 中配置对应 Agent 的 API 地址。</div>';
        }
        const options = [['', placeholder]].concat(providers.map(function (provider) {
          return [provider.id, provider.name + ' (' + provider.key + ')'];
        }));
        return field('Provider', select(id, options, selectedId));
      }

      function renderParseNotice(agent) {
        return agent.parseError ? '<div class="notice">配置文件解析失败：' + h(agent.parseError) + '。请先修复或打开配置文件查看。</div>' : '';
      }

      function renderClaudeMismatch(agent) {
        if (!agent.parseError && agent.baseUrl && !agent.selectedProviderId) {
          return '<div class="notice">当前 Claude baseURL 没有匹配任何 Provider。选择 Provider 后保存会接管 baseURL、token、TLS、代理和模型环境变量。</div>';
        }
        return '';
      }

      function renderProviderMismatch(agentLabel, currentProvider, baseUrl, selectedProviderId) {
        if (currentProvider && !selectedProviderId) {
          return '<div class="notice">当前 ' + h(agentLabel) + ' Provider（' + h(currentProvider) + ' / ' + h(baseUrl || '无 baseURL') + '）没有匹配任何已保存 Provider。</div>';
        }
        return '';
      }

      function modelSelect(id, provider, current, disabled) {
        const models = provider ? provider.models.slice() : [];
        const options = [];
        const currentValue = current || '';
        if (currentValue && models.indexOf(currentValue) === -1) {
          options.push([currentValue, '当前：' + currentValue + '（不在 Provider 模型列表）']);
        }
        models.forEach(function (model) {
          options.push([model, model]);
        });
        if (!options.length) {
          options.push(['', '无可用模型']);
        }
        return select(id, options, currentValue, disabled);
      }

      function currentModelForSelection(provider, selectedId, currentProviderId, current) {
        if (!provider || !current) {
          return current || '';
        }
        if (selectedId && currentProviderId && selectedId === currentProviderId) {
          return current;
        }
        return provider.models.indexOf(current) >= 0 ? current : '';
      }

      function providersFor(agent) {
        const key = agent === 'claude' ? 'claudeBaseUrl' : agent === 'codex' ? 'codexBaseUrl' : 'opencodeBaseUrl';
        return state.providers.filter(function (provider) { return Boolean(provider[key]); });
      }

      function getEditingProvider() {
        if (editingProviderId !== '__new') {
          const existing = state.providers.find(function (provider) { return provider.id === editingProviderId; });
          if (existing) {
            return existing;
          }
        }
        return {
          id: '',
          key: '',
          name: '',
          apiKey: '',
          proxyMode: 'direct',
          customProxyUrl: '',
          sslCheck: false,
          models: [],
          claudeBaseUrl: '',
          codexBaseUrl: '',
          codexWireApi: 'responses',
          opencodeBaseUrl: ''
        };
      }

      function renderAgentBadges(provider) {
        return [
          badge('Claude', provider.claudeBaseUrl),
          badge('Codex', provider.codexBaseUrl),
          badge('opencode', provider.opencodeBaseUrl)
        ].join('');
      }

      function badge(label, enabled) {
        return '<span class="badge ' + (enabled ? '' : 'off') + '">' + h(label) + '</span>';
      }

      function field(label, control) {
        return '<label><span>' + h(label) + '</span>' + control + '</label>';
      }

      function select(id, options, selected, disabled) {
        return '<select id="' + h(id) + '" ' + (disabled ? 'disabled' : '') + '>' + options.map(function (option) {
          const value = option[0];
          const label = option[1];
          return '<option value="' + attr(value) + '" ' + (value === selected ? 'selected' : '') + '>' + h(label) + '</option>';
        }).join('') + '</select>';
      }

      function collectProviderForm() {
        const id = editingProviderId !== '__new' ? editingProviderId : undefined;
        return {
          id: id,
          name: value('providerName'),
          apiKey: value('providerApiKey'),
          proxyMode: value('providerProxyMode'),
          customProxyUrl: value('providerCustomProxyUrl'),
          sslCheck: checked('providerSslCheck'),
          models: value('providerModels').split(/[\\n,]+/).map(function (item) { return item.trim(); }).filter(Boolean),
          claudeBaseUrl: value('providerClaudeBaseUrl'),
          codexBaseUrl: value('providerCodexBaseUrl'),
          codexWireApi: value('providerCodexWireApi'),
          opencodeBaseUrl: value('providerOpencodeBaseUrl')
        };
      }

      function saveClaude() {
        const providerId = value('claudeProviderSelect');
        const models = {};
        claudeKeys.forEach(function (key) {
          models[key] = value('claudeModel_' + key);
        });
        post('saveClaude', { providerId: providerId, models: models });
      }

      function saveCodex() {
        post('saveCodex', {
          providerId: value('codexProviderSelect'),
          model: value('codexModel')
        });
      }

      function saveOpencode() {
        post('saveOpencode', {
          providerId: value('opencodeProviderSelect'),
          model: value('opencodeModel')
        });
      }

      function value(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
      }

      function checked(id) {
        const element = document.getElementById(id);
        return Boolean(element && element.checked);
      }

      function post(type, payload) {
        vscode.postMessage({ type: type, payload: payload });
      }

      function showBanner(message, isError) {
        const banner = document.getElementById('banner');
        banner.textContent = message;
        banner.className = 'banner visible' + (isError ? ' error' : '');
        if (bannerTimer) {
          clearTimeout(bannerTimer);
        }
        bannerTimer = setTimeout(function () {
          banner.className = 'banner';
        }, 4500);
      }

      function h(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function attr(value) {
        return h(value).replace(/\\n/g, '&#10;');
      }
    })();
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let index = 0; index < 32; index += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
