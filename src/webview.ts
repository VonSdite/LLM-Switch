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
    [hidden] {
      display: none !important;
    }
    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
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
    button.ghost {
      border-color: var(--vscode-panel-border);
      background: transparent;
      color: var(--vscode-foreground);
    }
    button.ghost:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }
    button.icon-button {
      width: 32px;
      min-height: 32px;
      padding: 0;
      display: inline-grid;
      place-items: center;
      font-size: 18px;
      line-height: 1;
    }
    button.danger {
      background: #b42318;
      color: #ffffff;
      border-color: #f85149;
    }
    button.danger:hover {
      background: #da3633;
      color: #ffffff;
      border-color: #ff7b72;
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
    .label-line {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .help-icon {
      width: 16px;
      height: 16px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--vscode-descriptionForeground);
      border-radius: 50%;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      line-height: 1;
      cursor: help;
      user-select: none;
    }
    .help-icon:hover {
      color: var(--vscode-foreground);
      border-color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
    }
    .input-with-action {
      position: relative;
      display: block;
    }
    .input-with-action input {
      min-width: 0;
      padding-right: 40px;
    }
    .input-action-button {
      position: absolute;
      top: 1px;
      right: 1px;
      bottom: 1px;
      width: 34px;
      min-height: 0;
      padding: 0;
      display: inline-grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      border-radius: 3px;
    }
    .input-action-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }
    .svg-icon {
      width: 16px;
      height: 16px;
      display: block;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th,
    td {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 8px 9px;
      text-align: left;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    th {
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBarSectionHeader-background);
      font-size: 12px;
      font-weight: 650;
    }
    tbody tr {
      background: var(--vscode-editor-background);
    }
    tbody tr:hover {
      background: var(--vscode-list-hoverBackground);
    }
    tbody tr.drag-over {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto auto 1fr;
    }
    .topbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editor-background);
    }
    .refresh-button {
      align-self: center;
      min-height: 30px;
      border-color: var(--vscode-button-secondaryBorder, var(--vscode-panel-border));
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      padding: 4px 10px;
      border-radius: 4px;
    }
    .refresh-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .tabs,
    .subtabs {
      display: flex;
      gap: 2px;
      overflow-x: auto;
    }
    .tabs {
      flex: 1;
      min-width: 0;
      padding: 0;
      background: transparent;
    }
    .subtabs {
      padding: 0;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .tab,
    .subtab {
      border: 1px solid transparent;
      border-bottom: 2px solid transparent;
      border-radius: 4px 4px 0 0;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }
    .tab {
      padding: 8px 12px;
      min-height: 34px;
    }
    .subtab {
      padding: 7px 10px;
      min-height: 32px;
    }
    .tab:hover,
    .subtab:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
    }
    .tab.active,
    .subtab.active {
      color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
      border-color: var(--vscode-panel-border);
      border-bottom-color: var(--vscode-focusBorder);
      background: var(--vscode-editor-background);
    }
    .tab.active:hover,
    .subtab.active:hover {
      color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
      background: var(--vscode-editor-background);
    }
    main {
      min-width: 0;
      padding: 12px;
    }
    .page-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .page-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
    }
    .page-head p {
      margin: 2px 0 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .table-wrap {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: visible;
      background: var(--vscode-editor-background);
    }
    .drag-col {
      width: 42px;
      text-align: center;
    }
    .name-col {
      width: 18%;
    }
    .agents-col {
      width: 18%;
    }
    .models-col,
    .ssl-col {
      width: 84px;
    }
    .proxy-col {
      width: 120px;
    }
    .actions-col {
      width: 160px;
    }
    .drag-handle {
      width: 26px;
      min-height: 26px;
      padding: 0;
      border: 1px solid transparent;
      background: transparent;
      color: var(--vscode-descriptionForeground);
      cursor: grab;
      line-height: 1;
    }
    .drag-handle:hover {
      border-color: var(--vscode-panel-border);
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }
    .drag-handle:active {
      cursor: grabbing;
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
    .nowrap {
      white-space: nowrap;
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
    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
      position: relative;
    }
    .row-actions button {
      min-height: 26px;
      padding: 4px 8px;
    }
    .delete-popover {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      z-index: 12;
      width: 280px;
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      text-align: left;
    }
    .delete-popover::before {
      content: "";
      position: absolute;
      right: 22px;
      top: -6px;
      width: 10px;
      height: 10px;
      border-left: 1px solid var(--vscode-panel-border);
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      transform: rotate(45deg);
    }
    .delete-popover-title {
      font-weight: 650;
    }
    .delete-popover-text {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .delete-popover-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .empty {
      border: 1px dashed var(--vscode-panel-border);
      border-radius: 6px;
      padding: 14px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
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
      gap: 8px;
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
      justify-content: flex-end;
    }
    .path-editor {
      display: grid;
      gap: 9px;
      margin-bottom: 12px;
      padding: 7px 9px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-editor-background);
    }
    .path-line {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: end;
    }
    .path-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
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
      max-width: 920px;
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
      gap: 8px;
      color: var(--vscode-descriptionForeground);
      border-left: 2px solid var(--vscode-focusBorder);
      padding-left: 10px;
      margin-bottom: 4px;
    }
    .change-title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--vscode-foreground);
      font-weight: 650;
    }
    .change-provider {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-weight: 400;
    }
    .change-list {
      display: grid;
      gap: 5px;
    }
    .change-row {
      display: grid;
      grid-template-columns: minmax(260px, 0.95fr) minmax(260px, 1fr);
      gap: 10px;
      align-items: center;
    }
    .change-key {
      color: var(--vscode-foreground);
      background: var(--vscode-textCodeBlock-background, transparent);
      border-radius: 4px;
      padding: 2px 4px;
      overflow-wrap: anywhere;
    }
    .change-values {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 7px;
      align-items: center;
    }
    .change-value {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .change-next {
      color: var(--vscode-foreground);
    }
    .change-arrow {
      color: var(--vscode-descriptionForeground);
    }
    .change-row.changed .change-arrow {
      color: var(--vscode-focusBorder);
      font-weight: 650;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: start center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.45);
      overflow: auto;
    }
    .modal {
      width: 920px;
      max-width: none;
      max-height: min(86vh, 920px);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editor-background);
      box-shadow: 0 12px 38px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }
    .modal-head,
    .modal-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editor-background);
    }
    .modal-foot {
      justify-content: flex-end;
      border-top: 1px solid var(--vscode-panel-border);
      border-bottom: 0;
    }
    .modal-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
    }
    .modal-body {
      min-height: 0;
      overflow: auto;
      padding: 10px 12px;
      display: grid;
      gap: 10px;
    }
    .checkbox-line {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 30px;
    }
    .checkbox-line input {
      width: auto;
      min-height: auto;
    }
    @media (max-width: 760px) {
      .grid,
      .model-row,
      .change-row,
      .path-line,
      .page-head {
        grid-template-columns: 1fr;
      }
      .page-head {
        display: grid;
      }
      .modal-backdrop {
        padding: 10px;
      }
      .row-actions {
        justify-content: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <nav class="tabs" id="tabs"></nav>
      <button class="refresh-button" data-action="refresh" title="刷新配置">刷新</button>
    </header>
    <main id="app">
      <div class="empty">Loading...</div>
    </main>
  </div>

  <script nonce="${nonce}">
    (function () {
      const vscode = acquireVsCodeApi();
      const topTabs = [
        ['providers', 'Providers'],
        ['agents', 'Agents']
      ];
      const agentTabs = [
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
      const providerNameRule = '只允许英文字母、数字、下划线和中划线，长度 1-64，且必须以字母或数字开头。名称需唯一。';
      let activeTab = restored.activeTab || 'providers';
      let activeAgentTab = restored.activeAgentTab || 'claude';
      let state = { providers: [], agents: null };
      let drafts = {
        claudeProviderId: null,
        claudeModels: {},
        codexProviderId: null,
        codexModel: null,
        opencodeProviderId: null,
        opencodeModel: null
      };
      let providerModal = null;
      let deleteConfirmId = null;
      let draggedProviderId = null;
      let dragOverProviderId = null;

      window.addEventListener('message', function (event) {
        const message = event.data;
        if (message.type === 'state') {
          state = message.state;
          if (deleteConfirmId && !state.providers.some(function (provider) { return provider.id === deleteConfirmId; })) {
            deleteConfirmId = null;
          }
          render();
        }
        if (message.type === 'error') {
          return;
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
          providerModal = null;
          render();
        }
        if (action === 'agent-tab') {
          activeAgentTab = button.getAttribute('data-agent-tab') || 'claude';
          render();
        }
        if (action === 'refresh') {
          post('refresh', {});
        }
        if (action === 'provider-new') {
          deleteConfirmId = null;
          openProviderModal();
        }
        if (action === 'provider-edit') {
          deleteConfirmId = null;
          openProviderModal(button.getAttribute('data-provider-id') || '');
        }
        if (action === 'provider-modal-close') {
          providerModal = null;
          render();
        }
        if (action === 'provider-save') {
          saveProviderFromModal();
        }
        if (action === 'provider-api-key-toggle') {
          toggleProviderApiKey(button);
        }
        if (action === 'provider-delete') {
          const id = button.getAttribute('data-provider-id');
          if (id) {
            deleteConfirmId = id;
            render();
          }
        }
        if (action === 'provider-delete-cancel') {
          deleteConfirmId = null;
          render();
        }
        if (action === 'provider-delete-confirm') {
          const id = button.getAttribute('data-provider-id');
          if (id) {
            deleteConfirmId = null;
            render();
            post('deleteProvider', { id: id });
          }
        }
        if (action === 'open-config-path') {
          post('openConfigPath', { target: button.getAttribute('data-config-path-target') });
        }
        if (action === 'reset-config-path') {
          post('resetAgentConfigPath', { target: button.getAttribute('data-config-path-target') });
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
          drafts.claudeModels = {};
          render();
        }
        if (target.id.indexOf('claudeModel_') === 0) {
          drafts.claudeModels[target.id.slice('claudeModel_'.length)] = target.value;
          render();
        }
        if (target.id === 'codexProviderSelect') {
          drafts.codexProviderId = target.value;
          drafts.codexModel = null;
          render();
        }
        if (target.id === 'codexModel') {
          drafts.codexModel = target.value;
          render();
        }
        if (target.id === 'opencodeProviderSelect') {
          drafts.opencodeProviderId = target.value;
          drafts.opencodeModel = null;
          render();
        }
        if (target.id === 'opencodeModel') {
          drafts.opencodeModel = target.value;
          render();
        }
        if (target.id === 'providerProxyMode') {
          const field = document.getElementById('customProxyField');
          if (field) {
            field.style.display = target.value === 'custom' ? '' : 'none';
            field.hidden = target.value !== 'custom';
          }
        }
      });

      document.addEventListener('focusout', function (event) {
        const target = event.target;
        if (target && target.dataset && target.dataset.configPathTarget) {
          saveAgentConfigPath(target.dataset.configPathTarget);
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && providerModal) {
          providerModal = null;
          render();
        }
        const target = event.target;
        if (event.key === 'Enter' && target && target.dataset && target.dataset.configPathTarget) {
          event.preventDefault();
          target.blur();
        }
      });

      document.addEventListener('dragstart', function (event) {
        const handle = event.target.closest('[data-drag-provider-id]');
        if (!handle) {
          return;
        }
        draggedProviderId = handle.getAttribute('data-drag-provider-id');
        if (event.dataTransfer && draggedProviderId) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', draggedProviderId);
        }
      });

      document.addEventListener('dragover', function (event) {
        const row = event.target.closest('[data-provider-row-id]');
        if (!row || !draggedProviderId) {
          return;
        }
        event.preventDefault();
        const targetId = row.getAttribute('data-provider-row-id');
        if (targetId !== dragOverProviderId) {
          clearDragOver();
          dragOverProviderId = targetId;
          row.classList.add('drag-over');
        }
      });

      document.addEventListener('dragleave', function (event) {
        const row = event.target.closest('[data-provider-row-id]');
        if (row && !row.contains(event.relatedTarget)) {
          row.classList.remove('drag-over');
        }
      });

      document.addEventListener('drop', function (event) {
        const row = event.target.closest('[data-provider-row-id]');
        if (!row || !draggedProviderId) {
          return;
        }
        event.preventDefault();
        const targetId = row.getAttribute('data-provider-row-id');
        clearDragOver();
        reorderProviders(draggedProviderId, targetId);
        draggedProviderId = null;
        dragOverProviderId = null;
      });

      document.addEventListener('dragend', function () {
        clearDragOver();
        draggedProviderId = null;
        dragOverProviderId = null;
      });

      post('ready', {});

      function render() {
        vscode.setState({ activeTab: activeTab, activeAgentTab: activeAgentTab });
        renderTabs();
        const app = document.getElementById('app');
        if (!state.agents) {
          app.innerHTML = '<div class="empty">Loading...</div>';
          return;
        }
        const content = activeTab === 'providers' ? renderProviders() : renderAgents();
        app.innerHTML = content + renderProviderModal();
      }

      function renderTabs() {
        const element = document.getElementById('tabs');
        element.innerHTML = topTabs.map(function (tab) {
          const id = tab[0];
          const label = tab[1];
          return '<button class="tab ' + (activeTab === id ? 'active' : '') + '" data-action="tab" data-tab="' + h(id) + '">' + h(label) + '</button>';
        }).join('');
      }

      function renderProviders() {
        return '<section>' +
          '<div class="page-head">' +
            '<div><h2>Providers</h2><p>管理共享 Provider。</p></div>' +
            '<button data-action="provider-new">新增 Provider</button>' +
          '</div>' +
          '<div class="table-wrap">' +
            '<table aria-label="Providers">' +
              '<thead><tr>' +
                '<th class="drag-col"></th>' +
                '<th class="name-col">Provider</th>' +
                '<th class="agents-col">Agents</th>' +
                '<th class="models-col">模型</th>' +
                '<th class="proxy-col">代理</th>' +
                '<th class="ssl-col">SSL</th>' +
                '<th class="actions-col">操作</th>' +
              '</tr></thead>' +
              '<tbody>' + renderProviderRows() + '</tbody>' +
            '</table>' +
          '</div>' +
        '</section>';
      }

      function renderProviderRows() {
        if (!state.providers.length) {
          return '<tr><td colspan="7"><div class="empty">还没有 Provider。点击右上角新增 Provider。</div></td></tr>';
        }
        return state.providers.map(function (provider) {
          return '<tr data-provider-row-id="' + h(provider.id) + '">' +
            '<td class="drag-col"><button class="drag-handle" draggable="true" data-drag-provider-id="' + h(provider.id) + '" title="拖拽排序" aria-label="拖拽排序">⋮⋮</button></td>' +
            '<td><div class="provider-name">' + h(provider.name) + '</div></td>' +
            '<td><span class="badges">' + renderAgentBadges(provider) + '</span></td>' +
            '<td class="nowrap">' + h(String(provider.models.length)) + '</td>' +
            '<td>' + h(proxyLabel(provider)) + '</td>' +
            '<td>' + h(provider.sslCheck ? 'check' : 'no check') + '</td>' +
            '<td><div class="row-actions">' +
              '<button class="secondary" data-action="provider-edit" data-provider-id="' + h(provider.id) + '">编辑</button>' +
              '<button class="danger" data-action="provider-delete" data-provider-id="' + h(provider.id) + '">删除</button>' +
              renderDeleteConfirm(provider) +
            '</div></td>' +
          '</tr>';
        }).join('');
      }

      function renderDeleteConfirm(provider) {
        if (deleteConfirmId !== provider.id) {
          return '';
        }
        return '<div class="delete-popover" role="dialog" aria-label="确认删除 Provider">' +
          '<div class="delete-popover-title">确认操作</div>' +
          '<div class="delete-popover-text">确认删除 Provider "' + h(provider.name) + '"？Agent 配置文件不会自动回滚。</div>' +
          '<div class="delete-popover-actions">' +
            '<button class="secondary" data-action="provider-delete-cancel">取消</button>' +
            '<button class="danger" data-action="provider-delete-confirm" data-provider-id="' + h(provider.id) + '">确认</button>' +
          '</div>' +
        '</div>';
      }

      function renderProviderModal() {
        if (!providerModal) {
          return '';
        }
        const selected = providerModal;
        return '<div class="modal-backdrop" role="presentation">' +
          '<section class="modal" role="dialog" aria-modal="true" aria-label="' + h(selected.id ? '编辑 Provider' : '新增 Provider') + '">' +
            '<header class="modal-head">' +
              '<h2>' + h(selected.id ? '编辑 Provider' : '新增 Provider') + '</h2>' +
              '<button class="ghost icon-button" data-action="provider-modal-close" title="关闭" aria-label="关闭">×</button>' +
            '</header>' +
            '<div class="modal-body">' +
              '<div class="section">' +
                '<h3 class="section-title">基础信息</h3>' +
                '<div class="grid">' +
                  fieldWithHelp('Provider 名称 *', providerNameRule, '<input id="providerName" value="' + attr(selected.name) + '" placeholder="例如 cpa666" maxlength="64" autocomplete="off" spellcheck="false">') +
                  field('API key（可留空）', '<div class="input-with-action"><input id="providerApiKey" type="password" value="' + attr(selected.apiKey) + '" autocomplete="off"><button type="button" class="input-action-button" data-action="provider-api-key-toggle" title="显示 API key" aria-label="显示 API key">' + icon('eye') + '</button></div>') +
                '</div>' +
              '</div>' +
              '<div class="section">' +
                '<h3 class="section-title">Agent API 地址</h3>' +
                field('Claude API 地址', '<input id="providerClaudeBaseUrl" value="' + attr(selected.claudeBaseUrl) + '" placeholder="http://host:port">') +
                '<div class="grid">' +
                  field('Codex API 地址', '<input id="providerCodexBaseUrl" value="' + attr(selected.codexBaseUrl) + '" placeholder="http://host:port/v1">') +
                  field('Codex wire_api', select('providerCodexWireApi', [['responses', 'responses'], ['chat', 'chat']], selected.codexWireApi)) +
                '</div>' +
                field('opencode API 地址', '<input id="providerOpencodeBaseUrl" value="' + attr(selected.opencodeBaseUrl) + '" placeholder="http://host:port/v1">') +
              '</div>' +
              '<div class="section">' +
                '<div class="grid">' +
                  field('代理模式', select('providerProxyMode', [['direct', '直连模式'], ['system', '系统代理模式'], ['custom', '自定义代理']], selected.proxyMode)) +
                  '<div id="customProxyField" ' + (selected.proxyMode === 'custom' ? '' : 'hidden') + '>' + field('自定义代理地址', '<input id="providerCustomProxyUrl" value="' + attr(selected.customProxyUrl) + '" placeholder="http://127.0.0.1:7890">') + '</div>' +
                '</div>' +
                '<label class="checkbox-line"><span>SSL 证书校验</span><input id="providerSslCheck" type="checkbox" ' + (selected.sslCheck ? 'checked' : '') + '></label>' +
              '</div>' +
              '<div class="section">' +
                '<h3 class="section-title">模型列表</h3>' +
                '<textarea id="providerModels" placeholder="每行一个模型，例如&#10;glm-5&#10;gpt-5.5">' + h(selected.models.join('\\n')) + '</textarea>' +
              '</div>' +
            '</div>' +
            '<footer class="modal-foot">' +
              '<button class="secondary" data-action="provider-modal-close">取消</button>' +
              '<button data-action="provider-save">保存</button>' +
            '</footer>' +
          '</section>' +
        '</div>';
      }

      function renderAgents() {
        return '<section>' +
          '<div class="page-head">' +
            '<div><h2>Agents</h2><p>为 Claude、Codex、opencode 应用 Provider 和模型配置。</p></div>' +
          '</div>' +
          renderAgentTabs() +
          (activeAgentTab === 'claude' ? renderClaude() : activeAgentTab === 'codex' ? renderCodex() : renderOpencode()) +
        '</section>';
      }

      function renderAgentTabs() {
        return '<nav class="subtabs">' + agentTabs.map(function (tab) {
          const id = tab[0];
          const label = tab[1];
          return '<button class="subtab ' + (activeAgentTab === id ? 'active' : '') + '" data-action="agent-tab" data-agent-tab="' + h(id) + '">' + h(label) + '</button>';
        }).join('') + '</nav>';
      }

      function renderClaude() {
        const agent = state.agents.claude;
        const providers = providersFor('claude');
        const selectedId = drafts.claudeProviderId !== null ? drafts.claudeProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        const selectedModels = {};
        claudeKeys.forEach(function (key) {
          selectedModels[key] = selectedClaudeModelValue(key, provider, selectedId, agent);
        });
        let notices = renderParseNotice(agent);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderConfigPath('claude', 'Claude settings.json', agent) +
          notices +
          renderProviderSelect('claudeProviderSelect', providers, selectedId, '选择 Claude Provider') +
          '<div class="form">' +
            '<h3 class="section-title">Claude 模型环境变量</h3>' +
            '<div class="model-grid">' + claudeKeys.map(function (key) {
              return '<div class="model-row">' +
                '<div><strong>' + h(key) + '</strong></div>' +
                modelSelect('claudeModel_' + key, provider, selectedModels[key], disabled, true) +
              '</div>';
            }).join('') + '</div>' +
            '<div class="actions"><button data-action="save-claude" ' + (disabled ? 'disabled' : '') + '>应用到 Claude</button></div>' +
            renderClaudeChangePreview(agent, provider, selectedModels) +
          '</div>' +
        '</section>';
      }

      function renderCodex() {
        const agent = state.agents.codex;
        const providers = providersFor('codex');
        const selectedId = drafts.codexProviderId !== null ? drafts.codexProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        const selectedModel = selectedCodexModelValue(provider, selectedId, agent);
        let notices = renderParseNotice(agent);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderConfigPath('codex', 'Codex config.toml', agent) +
          renderConfigPath('codexAuth', 'Codex auth.json', agent.auth) +
          notices +
          renderProviderSelect('codexProviderSelect', providers, selectedId, '选择 Codex Provider') +
          '<div class="form">' +
            '<h3 class="section-title">Codex 模型</h3>' +
            field('model', modelSelect('codexModel', provider, selectedModel, disabled)) +
            '<div class="actions"><button data-action="save-codex" ' + (disabled ? 'disabled' : '') + '>应用到 Codex</button></div>' +
            renderCodexChangePreview(agent, provider, selectedModel) +
          '</div>' +
        '</section>';
      }

      function renderOpencode() {
        const agent = state.agents.opencode;
        const providers = providersFor('opencode');
        const selectedId = drafts.opencodeProviderId !== null ? drafts.opencodeProviderId : agent.selectedProviderId;
        const provider = state.providers.find(function (item) { return item.id === selectedId; });
        const disabled = Boolean(agent.parseError) || !provider || provider.models.length === 0;
        const selectedModel = selectedOpencodeModelValue(provider, selectedId, agent);
        let notices = renderParseNotice(agent);
        if (provider && provider.models.length === 0) {
          notices += '<div class="notice">该 Provider 还没有模型列表，请先回到 Providers 添加模型。</div>';
        }

        return '<section class="agent-panel">' +
          renderConfigPath('opencode', 'opencode.json', agent) +
          notices +
          renderProviderSelect('opencodeProviderSelect', providers, selectedId, '选择 opencode Provider') +
          '<div class="form">' +
            '<h3 class="section-title">opencode 模型</h3>' +
            field('model', modelSelect('opencodeModel', provider, selectedModel, disabled)) +
            '<div class="actions"><button data-action="save-opencode" ' + (disabled ? 'disabled' : '') + '>应用到 opencode</button></div>' +
            renderOpencodeChangePreview(agent, provider, selectedModel) +
          '</div>' +
        '</section>';
      }

      function openProviderModal(id) {
        const existing = state.providers.find(function (provider) { return provider.id === id; });
        providerModal = existing ? copyProvider(existing) : emptyProvider();
        render();
      }

      function toggleProviderApiKey(button) {
        const input = document.getElementById('providerApiKey');
        if (!input) {
          return;
        }
        const shouldShow = input.type === 'password';
        input.type = shouldShow ? 'text' : 'password';
        button.innerHTML = icon(shouldShow ? 'eye-off' : 'eye');
        button.title = shouldShow ? '隐藏 API key' : '显示 API key';
        button.setAttribute('aria-label', button.title);
      }

      function saveProviderFromModal() {
        const payload = collectProviderForm();
        if (!payload.name.trim()) {
          toast('error', 'Provider 名称必填。');
          return;
        }
        if (!isValidProviderName(payload.name)) {
          toast('error', providerNameRule);
          return;
        }
        if (state.providers.some(function (provider) { return provider.id !== payload.id && sameProviderName(provider.name, payload.name); })) {
          toast('error', 'Provider 名称不能重复。');
          return;
        }
        if (payload.proxyMode === 'custom' && !payload.customProxyUrl.trim()) {
          toast('error', '自定义代理模式需要填写代理地址。');
          return;
        }
        providerModal = null;
        render();
        post('saveProvider', payload);
      }

      function collectProviderForm() {
        return {
          id: providerModal && providerModal.id ? providerModal.id : undefined,
          name: value('providerName'),
          apiKey: value('providerApiKey'),
          proxyMode: value('providerProxyMode'),
          customProxyUrl: value('providerProxyMode') === 'custom' ? value('providerCustomProxyUrl') : '',
          sslCheck: checked('providerSslCheck'),
          models: value('providerModels').split(/[\\n,]+/).map(function (item) { return item.trim(); }).filter(Boolean),
          claudeBaseUrl: value('providerClaudeBaseUrl'),
          codexBaseUrl: value('providerCodexBaseUrl'),
          codexWireApi: value('providerCodexWireApi'),
          opencodeBaseUrl: value('providerOpencodeBaseUrl')
        };
      }

      function reorderProviders(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) {
          return;
        }
        const ids = state.providers.map(function (provider) { return provider.id; });
        const fromIndex = ids.indexOf(sourceId);
        const toIndex = ids.indexOf(targetId);
        if (fromIndex < 0 || toIndex < 0) {
          return;
        }
        const moved = ids.splice(fromIndex, 1)[0];
        ids.splice(toIndex, 0, moved);
        const byId = {};
        state.providers.forEach(function (provider) { byId[provider.id] = provider; });
        state.providers = ids.map(function (id) { return byId[id]; }).filter(Boolean);
        render();
        post('reorderProviders', { orderedIds: ids });
      }

      function clearDragOver() {
        document.querySelectorAll('.drag-over').forEach(function (row) {
          row.classList.remove('drag-over');
        });
      }

      function sameProviderName(left, right) {
        return String(left || '').trim().toLocaleLowerCase() === String(right || '').trim().toLocaleLowerCase();
      }

      function isValidProviderName(name) {
        return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(String(name || '').trim());
      }

      function renderConfigPath(target, label, configPath) {
        const inputId = target + 'ConfigPath';
        const inputValue = configPath.customPath || configPath.path;
        return '<div class="path-editor">' +
          '<div class="path-line">' +
            field(label + ' 路径', '<input id="' + h(inputId) + '" data-config-path-target="' + h(target) + '" value="' + attr(inputValue) + '" placeholder="' + attr(configPath.defaultPath) + '">') +
            '<div class="path-actions">' +
              '<button class="ghost" data-action="reset-config-path" data-config-path-target="' + h(target) + '">重置</button>' +
              '<button class="secondary" data-action="open-config-path" data-config-path-target="' + h(target) + '">打开配置</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (!configPath.exists ? '<div class="notice">配置文件尚不存在，请先创建该文件后再打开或应用配置。</div>' : '');
      }

      function saveAgentConfigPath(target) {
        if (!target) {
          return;
        }
        const configPath = getConfigPathState(target);
        const nextPath = value(target + 'ConfigPath');
        if (configPath && nextPath.trim() === (configPath.customPath || configPath.path).trim()) {
          return;
        }
        post('saveAgentConfigPath', {
          target: target,
          path: nextPath
        });
      }

      function getConfigPathState(target) {
        if (!state.agents) {
          return null;
        }
        if (target === 'codexAuth') {
          return state.agents.codex.auth;
        }
        return state.agents[target] || null;
      }

      function renderProviderSelect(id, providers, selectedId, placeholder) {
        if (!providers.length) {
          return '<div class="empty">没有可用 Provider。请先在 Providers 中配置对应 Agent 的 API 地址。</div>';
        }
        const options = [['', placeholder]].concat(providers.map(function (provider) {
          return [provider.id, provider.name];
        }));
        return field('Provider', select(id, options, selectedId));
      }

      function renderParseNotice(agent) {
        return agent.parseError ? '<div class="notice">配置文件解析失败：' + h(agent.parseError) + '。请先修复或打开配置文件查看。</div>' : '';
      }

      function selectedClaudeModelValue(key, provider, selectedId, agent) {
        if (Object.prototype.hasOwnProperty.call(drafts.claudeModels, key)) {
          return drafts.claudeModels[key];
        }
        return currentModelForSelection(provider, selectedId, agent.selectedProviderId, agent.models[key]);
      }

      function selectedCodexModelValue(provider, selectedId, agent) {
        if (drafts.codexModel !== null) {
          return drafts.codexModel;
        }
        return selectedSingleModelValue(provider, selectedId, agent.selectedProviderId, agent.model);
      }

      function selectedOpencodeModelValue(provider, selectedId, agent) {
        if (drafts.opencodeModel !== null) {
          return drafts.opencodeModel;
        }
        return selectedSingleModelValue(provider, selectedId, agent.selectedProviderId, agent.model);
      }

      function selectedSingleModelValue(provider, selectedId, currentProviderId, current) {
        const currentValue = currentModelForSelection(provider, selectedId, currentProviderId, current);
        if (currentValue) {
          return currentValue;
        }
        return provider && provider.models.length ? provider.models[0] : '';
      }

      function renderClaudeChangePreview(agent, provider, selectedModels) {
        if (!provider) {
          return '';
        }
        const rows = [
          ['ANTHROPIC_BASE_URL', valueLabel(agent.baseUrl), valueLabel(provider.claudeBaseUrl)],
          ['ANTHROPIC_AUTH_TOKEN', secretLabel(agent.hasAuthToken), secretLabel(provider.apiKey)]
        ].concat(claudeKeys.map(function (key) {
          return [key, valueLabel(agent.models[key]), valueLabel(selectedModels[key])];
        }));

        return renderChangePreview('保存预览', 'Provider: ' + provider.name, rows);
      }

      function renderCodexChangePreview(agent, provider, selectedModel) {
        if (!provider) {
          return '';
        }
        const providerName = provider.name;
        const providerKey = 'model_providers.' + tomlPathKey(providerName);
        const hasCurrentBlock = agent.modelProvider === providerName;
        const rows = [
          ['model_provider', valueLabel(agent.modelProvider), valueLabel(providerName)],
          ['model', valueLabel(agent.model), valueLabel(selectedModel)],
          [providerKey + '.name', hasCurrentBlock ? valueLabel(agent.providerName) : '未配置', valueLabel(provider.name)],
          [providerKey + '.base_url', hasCurrentBlock ? valueLabel(agent.providerBaseUrl) : '未配置', valueLabel(provider.codexBaseUrl)],
          [providerKey + '.wire_api', hasCurrentBlock ? valueLabel(agent.wireApi) : '未配置', valueLabel(provider.codexWireApi)],
          ['auth.json.OPENAI_API_KEY', secretLabel(agent.hasOpenAiApiKey), secretLabel(provider.apiKey)]
        ];

        return renderChangePreview('保存预览', 'Provider: ' + provider.name, rows);
      }

      function renderOpencodeChangePreview(agent, provider, selectedModel) {
        if (!provider) {
          return '';
        }
        const providerKey = 'provider.' + provider.key;
        const hasCurrentBlock = agent.providerKey === provider.key;
        const currentModel = agent.providerKey && agent.model ? agent.providerKey + '/' + agent.model : agent.model;
        const nextModel = selectedModel ? provider.key + '/' + selectedModel : '';
        const nextModelCount = !selectedModel ? provider.models.length : provider.models.indexOf(selectedModel) >= 0 ? provider.models.length : provider.models.length + 1;
        const rows = [
          ['model', valueLabel(currentModel), valueLabel(nextModel)],
          [providerKey + '.npm', hasCurrentBlock ? valueLabel(agent.providerNpm) : '未配置', '@ai-sdk/openai-compatible'],
          [providerKey + '.name', hasCurrentBlock ? valueLabel(agent.providerName) : '未配置', valueLabel(provider.name)],
          [providerKey + '.options.baseURL', hasCurrentBlock ? valueLabel(agent.providerBaseUrl) : '未配置', valueLabel(provider.opencodeBaseUrl)],
          [providerKey + '.options.apiKey', hasCurrentBlock ? secretLabel(agent.hasProviderApiKey) : '未配置', secretLabel(provider.apiKey)],
          [providerKey + '.models', hasCurrentBlock ? countLabel(agent.providerModelCount) : '未配置', countLabel(nextModelCount)]
        ];

        return renderChangePreview('保存预览', 'Provider: ' + provider.name, rows);
      }

      function renderChangePreview(title, suffix, rows) {
        return '<div class="summary">' +
          '<div class="change-title"><span>' + h(title) + '</span><span class="change-provider">' + h(suffix) + '</span></div>' +
          '<div class="change-list">' + rows.map(function (row) {
            const key = row[0];
            const before = row[1];
            const after = row[2];
            return '<div class="change-row ' + (before === after ? '' : 'changed') + '">' +
              '<code class="change-key">' + h(key) + '</code>' +
              '<div class="change-values">' +
                '<span class="change-value" title="当前值">' + h(before) + '</span>' +
                '<span class="change-arrow" aria-hidden="true">&rarr;</span>' +
                '<span class="change-value change-next" title="保存后">' + h(after) + '</span>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>';
      }

      function valueLabel(value) {
        const text = String(value || '').trim();
        return text ? text : '未配置';
      }

      function secretLabel(value) {
        return value ? '已设置' : '未配置';
      }

      function countLabel(value) {
        const count = Number(value || 0);
        return count > 0 ? String(count) + ' 个模型' : '未配置';
      }

      function tomlPathKey(value) {
        const text = String(value || '');
        return /^[A-Za-z0-9_-]+$/.test(text) ? text : JSON.stringify(text);
      }

      function modelSelect(id, provider, current, disabled, allowUnset) {
        const models = provider ? provider.models.slice() : [];
        const options = [];
        const currentValue = current || '';
        if (allowUnset) {
          options.push(['', '不设置']);
        }
        if (currentValue && models.indexOf(currentValue) === -1) {
          options.push([currentValue, '当前：' + currentValue + '（不在 Provider 模型列表）']);
        }
        models.forEach(function (model) {
          options.push([model, model]);
        });
        if (!options.length) {
          options.push(['', '未配置']);
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

      function emptyProvider() {
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

      function copyProvider(provider) {
        return {
          id: provider.id,
          key: provider.key,
          name: provider.name,
          apiKey: provider.apiKey,
          proxyMode: provider.proxyMode,
          customProxyUrl: provider.customProxyUrl,
          sslCheck: provider.sslCheck,
          models: provider.models.slice(),
          claudeBaseUrl: provider.claudeBaseUrl,
          codexBaseUrl: provider.codexBaseUrl,
          codexWireApi: provider.codexWireApi,
          opencodeBaseUrl: provider.opencodeBaseUrl
        };
      }

      function renderAgentBadges(provider) {
        return [
          provider.claudeBaseUrl ? badge('Claude') : '',
          provider.codexBaseUrl ? badge('Codex') : '',
          provider.opencodeBaseUrl ? badge('opencode') : ''
        ].join('');
      }

      function badge(label) {
        return '<span class="badge">' + h(label) + '</span>';
      }

      function proxyLabel(provider) {
        if (provider.proxyMode === 'custom') {
          return provider.customProxyUrl ? '自定义' : '自定义（未填）';
        }
        if (provider.proxyMode === 'system') {
          return '系统代理';
        }
        return '直连';
      }

      function field(label, control) {
        return '<label><span>' + h(label) + '</span>' + control + '</label>';
      }

      function fieldWithHelp(label, help, control) {
        return '<label><span class="label-line"><span>' + h(label) + '</span><span class="help-icon" title="' + attr(help) + '" aria-label="' + attr(help) + '">?</span></span>' + control + '</label>';
      }

      function icon(name) {
        if (name === 'eye-off') {
          return '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.1A11 11 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-2.1 3.2"></path><path d="M6.6 6.6C3.2 8.8 2 12 2 12s3 7 10 7a10.8 10.8 0 0 0 4.4-.9"></path><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"></path><path d="M3 3l18 18"></path></svg>';
        }
        return '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }

      function select(id, options, selected, disabled) {
        return '<select id="' + h(id) + '" ' + (disabled ? 'disabled' : '') + '>' + options.map(function (option) {
          const value = option[0];
          const label = option[1];
          return '<option value="' + attr(value) + '" ' + (value === selected ? 'selected' : '') + '>' + h(label) + '</option>';
        }).join('') + '</select>';
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

      function toast(level, message) {
        post('toast', { level: level, message: message });
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
