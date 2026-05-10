import * as vscode from 'vscode';
import {
  openAgentConfigFiles,
  openConfigPath,
  readAgentsState,
  saveClaudeConfig,
  saveCodexConfig,
  saveOpencodeConfig
} from './agentConfigs';
import { ConfigPathTarget, resetAgentConfigPath, setAgentConfigPath } from './configPaths';
import { deleteProvider, loadProviders, reorderProviders, upsertProvider } from './providerStore';
import { getManagerHtml } from './webview';
import { AgentName, WebviewState } from './types';

interface WebviewMessage {
  type: string;
  payload?: unknown;
}

interface FetchProviderModelsPayload {
  apiKey: string;
  claudeBaseUrl: string;
  codexBaseUrl: string;
  opencodeBaseUrl: string;
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new LlmSwitchManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('llm-switch.openManager', () => manager.openPanel()),
    vscode.commands.registerCommand('llm-switch.openClaudeConfig', () => openConfigInEditor(context, 'claude')),
    vscode.commands.registerCommand('llm-switch.openCodexConfig', () => openConfigInEditor(context, 'codex')),
    vscode.commands.registerCommand('llm-switch.openOpencodeConfig', () => openConfigInEditor(context, 'opencode'))
  );
}

export function deactivate(): void {
  // No background resources to release.
}

class LlmSwitchManager {
  private readonly webviews = new Set<vscode.Webview>();
  private panel: vscode.WebviewPanel | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async openPanel(): Promise<void> {
    if (this.panel) {
      try {
        this.panel.reveal(vscode.ViewColumn.One);
        await this.postState(this.panel.webview);
        return;
      } catch {
        this.panel = undefined;
      }
    }

    const panel = vscode.window.createWebviewPanel(
      'llmSwitch.manager',
      'LLM-Switch',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel = panel;
    const disposables: vscode.Disposable[] = [];
    this.configureWebview(panel.webview, disposables);
    panel.onDidDispose(() => {
      this.webviews.delete(panel.webview);
      if (this.panel === panel) {
        this.panel = undefined;
      }
      while (disposables.length > 0) {
        disposables.pop()?.dispose();
      }
    });
  }

  private configureWebview(webview: vscode.Webview, disposables: vscode.Disposable[]): void {
    webview.options = {
      enableScripts: true
    };
    webview.html = getManagerHtml(webview);
    this.webviews.add(webview);
    disposables.push(
      webview.onDidReceiveMessage((message: WebviewMessage) => this.handleMessage(webview, message))
    );
  }

  private async handleMessage(webview: vscode.Webview, message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
        case 'refresh':
          await this.postState(webview);
          return;
        case 'toast':
          await showToast(
            stringField(message.payload, 'level'),
            stringField(message.payload, 'message')
          );
          return;
        case 'saveProvider':
          await upsertProvider(this.context, asRecord(message.payload));
          await this.broadcastState();
          return;
        case 'deleteProvider':
          await deleteProvider(this.context, stringField(message.payload, 'id'));
          await this.broadcastState();
          return;
        case 'reorderProviders':
          await reorderProviders(this.context, stringArrayField(message.payload, 'orderedIds'));
          await this.broadcastState();
          return;
        case 'saveAgentConfigPath':
          await setAgentConfigPath(this.context, configPathTargetFromPayload(message.payload), stringField(message.payload, 'path'));
          await this.broadcastState();
          return;
        case 'resetAgentConfigPath':
          await resetAgentConfigPath(this.context, configPathTargetFromPayload(message.payload));
          await this.broadcastState();
          return;
        case 'saveClaude':
          await saveClaudeConfig(this.context, loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState();
          return;
        case 'saveCodex':
          await saveCodexConfig(this.context, loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState();
          return;
        case 'saveOpencode':
          await saveOpencodeConfig(this.context, loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState();
          return;
        case 'openConfig':
          await openConfigInEditor(this.context, assertAgentName(stringField(message.payload, 'agent')));
          await this.postState(webview);
          return;
        case 'openConfigPath':
          await openConfigPathInEditor(this.context, configPathTargetFromPayload(message.payload));
          await this.postState(webview);
          return;
        case 'fetchProviderModels': {
          const result = await fetchProviderModels(fetchProviderModelsPayload(message.payload));
          await webview.postMessage({ type: 'providerModelsFetched', ...result });
          return;
        }
        default:
          return;
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      void webview.postMessage({ type: 'error', message: messageText });
      void vscode.window.showErrorMessage(`LLM-Switch: ${messageText}`);
    }
  }

  private async getState(): Promise<WebviewState> {
    const providers = loadProviders(this.context);
    const agents = await readAgentsState(this.context, providers);
    return { providers, agents };
  }

  private async postState(webview: vscode.Webview): Promise<void> {
    await webview.postMessage({ type: 'state', state: await this.getState() });
  }

  private async broadcastState(): Promise<void> {
    const state = await this.getState();
    await Promise.all(Array.from(this.webviews).map(async (webview) => {
      try {
        await webview.postMessage({ type: 'state', state });
      } catch {
        this.webviews.delete(webview);
      }
    }));
  }

}

async function showToast(level: string, message: string): Promise<void> {
  if (!message) {
    return;
  }
  if (level === 'warning') {
    await vscode.window.showWarningMessage(message);
    return;
  }
  if (level === 'info') {
    await vscode.window.showInformationMessage(message);
    return;
  }
  await vscode.window.showErrorMessage(message);
}

async function openConfigInEditor(context: vscode.ExtensionContext, agent: AgentName): Promise<void> {
  const filePaths = await openAgentConfigFiles(context, agent);
  for (const filePath of filePaths) {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(document, { preview: false });
  }
}

async function openConfigPathInEditor(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<void> {
  const filePath = await openConfigPath(context, target);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(document, { preview: false });
}

function assertAgentName(value: string): AgentName {
  if (value === 'claude' || value === 'codex' || value === 'opencode') {
    return value;
  }
  throw new Error('未知 Agent。');
}

function configPathTargetFromPayload(payload: unknown): ConfigPathTarget {
  const record = asRecord(payload);
  const target = typeof record.target === 'string' ? record.target : stringField(record, 'agent');
  return assertConfigPathTarget(target);
}

function assertConfigPathTarget(value: string): ConfigPathTarget {
  if (value === 'claude' || value === 'codex' || value === 'codexAuth' || value === 'opencode') {
    return value;
  }
  throw new Error('未知配置路径。');
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringField(value: unknown, key: string): string {
  const record = asRecord(value);
  return typeof record[key] === 'string' ? record[key] : '';
}

function stringArrayField(value: unknown, key: string): string[] {
  const record = asRecord(value);
  const raw = record[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function fetchProviderModelsPayload(payload: unknown): FetchProviderModelsPayload {
  const record = asRecord(payload);
  return {
    apiKey: stringField(record, 'apiKey'),
    claudeBaseUrl: stringField(record, 'claudeBaseUrl'),
    codexBaseUrl: stringField(record, 'codexBaseUrl'),
    opencodeBaseUrl: stringField(record, 'opencodeBaseUrl')
  };
}

async function fetchProviderModels(payload: FetchProviderModelsPayload): Promise<{ models: string[]; sourceUrl: string }> {
  const baseUrl = inferModelApiBaseUrl(payload);
  const candidates = ['/v1/models', '/models'].map((suffix) => joinUrl(baseUrl, suffix));
  const errors: string[] = [];

  for (const url of candidates) {
    try {
      const models = await fetchModelsFromUrl(url, payload.apiKey);
      if (models.length > 0) {
        return { models, sourceUrl: url };
      }
      errors.push(`${url}: 未返回模型列表`);
    } catch (error) {
      errors.push(`${url}: ${errorMessage(error)}`);
    }
  }

  throw new Error(`拉取模型失败，已尝试 /v1/models 和 /models。${errors.join('；')}`);
}

function inferModelApiBaseUrl(payload: FetchProviderModelsPayload): string {
  const raw = [payload.codexBaseUrl, payload.opencodeBaseUrl, payload.claudeBaseUrl]
    .map((value) => value.trim())
    .find(Boolean);
  if (!raw) {
    throw new Error('请先填写至少一个 Agent API 地址。');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`API 地址无效：${raw}`);
  }

  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/g, '');
  if (url.pathname === '/v1' || url.pathname.endsWith('/v1')) {
    url.pathname = url.pathname.slice(0, -3) || '/';
  }
  url.pathname = url.pathname.replace(/\/+$/g, '');
  return url.toString().replace(/\/+$/g, '');
}

function joinUrl(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/+$/g, '')}/${suffix.replace(/^\/+/g, '')}`;
}

async function fetchModelsFromUrl(url: string, apiKey: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers: Record<string, string> = {
      accept: 'application/json'
    };
    if (apiKey.trim()) {
      headers.authorization = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${text ? ` ${text.slice(0, 160)}` : ''}`);
    }

    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('响应不是有效 JSON');
    }
    return extractModelNames(json);
  } finally {
    clearTimeout(timeout);
  }
}

function extractModelNames(value: unknown): string[] {
  const root = asRecord(value);
  const candidates = Array.isArray(value)
    ? value
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.models)
        ? root.models
        : [];
  const names = candidates.map((item) => {
    if (typeof item === 'string') {
      return item.trim();
    }
    const record = asRecord(item);
    return stringValue(record.id).trim() || stringValue(record.name).trim() || stringValue(record.model).trim();
  }).filter(Boolean);
  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
