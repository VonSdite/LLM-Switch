import * as http from 'node:http';
import * as https from 'node:https';
import * as tls from 'node:tls';
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
import { AgentName, CLAUDE_MODEL_KEYS, ClaudeAgentState, CodexAgentState, OpencodeAgentState, ProviderConfig, WebviewState } from './types';

interface WebviewMessage {
  type: string;
  payload?: unknown;
}

interface FetchProviderModelsPayload {
  apiKey: string;
  proxyMode: string;
  customProxyUrl: string;
  claudeBaseUrl: string;
  codexBaseUrl: string;
  opencodeBaseUrl: string;
}

interface ModelRequestOptions {
  apiKey: string;
  proxyMode: string;
  customProxyUrl: string;
}

interface ModelQuickPickItem extends vscode.QuickPickItem {
  providerId: string;
  model: string;
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new LlmSwitchManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('llm-switch.openManager', () => manager.openPanel()),
    vscode.commands.registerCommand('llm-switch.openClaudeConfig', () => openConfigInEditor(context, 'claude')),
    vscode.commands.registerCommand('llm-switch.openCodexConfig', () => openConfigInEditor(context, 'codex')),
    vscode.commands.registerCommand('llm-switch.openOpencodeConfig', () => openConfigInEditor(context, 'opencode')),
    vscode.commands.registerCommand('llm-switch.quickSwitchClaudeModel', () => manager.quickSwitchModel('claude')),
    vscode.commands.registerCommand('llm-switch.quickSwitchCodexModel', () => manager.quickSwitchModel('codex')),
    vscode.commands.registerCommand('llm-switch.quickSwitchOpencodeModel', () => manager.quickSwitchModel('opencode'))
  );
}

export function deactivate(): void {
  // No background resources to release.
}

class LlmSwitchManager {
  private readonly webviews = new Set<vscode.Webview>();
  private panel: vscode.WebviewPanel | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async quickSwitchModel(agent: AgentName): Promise<void> {
    try {
      const changed = await quickSwitchAgentModel(this.context, agent);
      if (changed) {
        await this.broadcastState();
      }
    } catch (error) {
      await vscode.window.showErrorMessage(`LLM-Switch: ${errorMessage(error)}`);
    }
  }

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
  if (agent === 'codex' && filePaths.length > 1) {
    await openFileInEditor(filePaths[0], vscode.ViewColumn.Active);
    await openFileInEditor(filePaths[1], vscode.ViewColumn.Beside);
    return;
  }

  for (const filePath of filePaths) {
    await openFileInEditor(filePath, vscode.ViewColumn.Active);
  }
}

async function openConfigPathInEditor(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<void> {
  const filePath = await openConfigPath(context, target);
  await openFileInEditor(filePath, vscode.ViewColumn.Active);
}

async function openFileInEditor(filePath: string, viewColumn: vscode.ViewColumn): Promise<void> {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(document, { preview: false, viewColumn });
}

async function quickSwitchAgentModel(context: vscode.ExtensionContext, agent: AgentName): Promise<boolean> {
  const providers = loadProviders(context);
  const agents = await readAgentsState(context, providers);
  const agentState = agents[agent];
  const agentLabel = agentDisplayName(agent);
  if (agentState.parseError) {
    throw new Error(`${agentLabel} 配置读取失败：${agentState.parseError}`);
  }

  const items = modelQuickPickItems(agent, providers, agentState);
  if (!items.length) {
    await vscode.window.showWarningMessage(`LLM-Switch: 没有可用于 ${agentLabel} 的 Provider 模型，请先在 Providers 配置对应 API 地址和模型列表。`);
    return false;
  }

  const currentModel = currentAgentModelLabel(agent, agentState, providers);
  const selected = await vscode.window.showQuickPick(items, {
    title: `LLM-Switch: 快速切换 ${agentLabel} 模型`,
    placeHolder: currentModel,
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!selected) {
    return false;
  }

  if (agent === 'claude') {
    const models = Object.fromEntries(CLAUDE_MODEL_KEYS.map((key) => [key, selected.model])) as Record<typeof CLAUDE_MODEL_KEYS[number], string>;
    await saveClaudeConfig(context, providers, { providerId: selected.providerId, models });
    return true;
  }
  if (agent === 'codex') {
    await saveCodexConfig(context, providers, { providerId: selected.providerId, model: selected.model });
    return true;
  }
  await saveOpencodeConfig(context, providers, { providerId: selected.providerId, model: selected.model });
  return true;
}

function modelQuickPickItems(agent: AgentName, providers: ProviderConfig[], agentState: ClaudeAgentState | CodexAgentState | OpencodeAgentState): ModelQuickPickItem[] {
  return providers
    .filter((provider) => providerSupportsAgent(provider, agent) && provider.models.length > 0)
    .flatMap((provider) => provider.models.map((model) => modelQuickPickItem(agent, provider, model, agentState)));
}

function modelQuickPickItem(agent: AgentName, provider: ProviderConfig, model: string, agentState: ClaudeAgentState | CodexAgentState | OpencodeAgentState): ModelQuickPickItem {
  const isCurrent = isCurrentAgentModel(agent, agentState, provider.id, model);
  return {
    label: `${provider.name} / ${model}`,
    description: isCurrent ? '当前' : undefined,
    detail: `${agentDisplayName(agent)} API: ${providerApiUrl(provider, agent)}`,
    providerId: provider.id,
    model
  };
}

function providerSupportsAgent(provider: ProviderConfig, agent: AgentName): boolean {
  return Boolean(providerApiUrl(provider, agent));
}

function providerApiUrl(provider: ProviderConfig, agent: AgentName): string {
  if (agent === 'claude') {
    return provider.claudeBaseUrl;
  }
  if (agent === 'codex') {
    return provider.codexBaseUrl;
  }
  return provider.opencodeBaseUrl;
}

function isCurrentAgentModel(agent: AgentName, agentState: ClaudeAgentState | CodexAgentState | OpencodeAgentState, providerId: string, model: string): boolean {
  if (agent === 'claude') {
    const claude = agentState as ClaudeAgentState;
    const currentModels = uniqueNonEmpty(CLAUDE_MODEL_KEYS.map((key) => claude.models[key]));
    return claude.selectedProviderId === providerId && currentModels.length === 1 && currentModels[0] === model;
  }
  if (agent === 'codex') {
    const codex = agentState as CodexAgentState;
    return codex.selectedProviderId === providerId && codex.model === model;
  }
  const opencode = agentState as OpencodeAgentState;
  return opencode.selectedProviderId === providerId && opencode.model === model;
}

function currentAgentModelLabel(agent: AgentName, agentState: ClaudeAgentState | CodexAgentState | OpencodeAgentState, providers: ProviderConfig[]): string {
  const providerName = currentProviderName(agentState.selectedProviderId, providers);
  if (agent === 'claude') {
    const claude = agentState as ClaudeAgentState;
    const currentModels = uniqueNonEmpty(CLAUDE_MODEL_KEYS.map((key) => claude.models[key]));
    if (!currentModels.length) {
      return `当前模型：${providerName ? `${providerName} / ` : ''}未配置`;
    }
    if (currentModels.length === 1) {
      return `当前模型：${providerName ? `${providerName} / ` : ''}${currentModels[0]}`;
    }
    return `当前 Claude 模型不一致：${summarizeModelCounts(CLAUDE_MODEL_KEYS.map((key) => claude.models[key]))}。选择后会统一写入 5 个模型环境变量。`;
  }
  if (agent === 'codex') {
    const codex = agentState as CodexAgentState;
    const owner = providerName || codex.modelProvider;
    return codex.model ? `当前模型：${owner ? `${owner} / ` : ''}${codex.model}` : '当前模型：未配置';
  }
  const opencode = agentState as OpencodeAgentState;
  const owner = providerName || opencode.providerKey;
  return opencode.model ? `当前模型：${owner ? `${owner} / ` : ''}${opencode.model}` : '当前模型：未配置';
}

function currentProviderName(providerId: string, providers: ProviderConfig[]): string {
  return providers.find((provider) => provider.id === providerId)?.name ?? '';
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function summarizeModelCounts(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const model = value.trim() || '未配置';
    counts.set(model, (counts.get(model) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([model, count]) => `${model} x${count}`)
    .join('，');
}

function agentDisplayName(agent: AgentName): string {
  if (agent === 'claude') {
    return 'Claude';
  }
  if (agent === 'codex') {
    return 'Codex';
  }
  return 'opencode';
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
    proxyMode: stringField(record, 'proxyMode'),
    customProxyUrl: stringField(record, 'customProxyUrl'),
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
      const models = await fetchModelsFromUrl(url, payload);
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

async function fetchModelsFromUrl(url: string, options: ModelRequestOptions): Promise<string[]> {
  const response = await requestText(url, options);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}${response.body ? ` ${response.body.slice(0, 160)}` : ''}`);
  }

  let json: unknown;
  try {
    json = response.body ? JSON.parse(response.body) : {};
  } catch {
    throw new Error('响应不是有效 JSON');
  }
  return extractModelNames(json);
}

function requestText(rawUrl: string, options: ModelRequestOptions): Promise<{ statusCode: number; body: string }> {
  const target = new URL(rawUrl);
  const headers = modelRequestHeaders(target, options.apiKey);
  if (options.proxyMode === 'custom' && options.customProxyUrl.trim()) {
    return requestViaProxy(target, headers, options.customProxyUrl.trim());
  }
  return requestDirect(target, headers);
}

function modelRequestHeaders(target: URL, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    host: target.host
  };
  if (apiKey.trim()) {
    headers.authorization = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

function requestDirect(target: URL, headers: Record<string, string>): Promise<{ statusCode: number; body: string }> {
  const transport = target.protocol === 'https:' ? https : http;
  return nodeRequest({
    transport,
    options: {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: 'GET',
      path: `${target.pathname}${target.search}`,
      headers,
      rejectUnauthorized: false
    }
  });
}

function requestViaProxy(target: URL, headers: Record<string, string>, proxyUrl: string): Promise<{ statusCode: number; body: string }> {
  const proxy = parseProxyUrl(proxyUrl);
  if (target.protocol === 'http:') {
    const transport = proxy.protocol === 'https:' ? https : http;
    const proxyHeaders = { ...headers, host: target.host };
    applyProxyAuthorization(proxyHeaders, proxy);
    return nodeRequest({
      transport,
      options: {
        protocol: proxy.protocol,
        hostname: proxy.hostname,
        port: proxy.port || undefined,
        method: 'GET',
        path: target.toString(),
        headers: proxyHeaders,
        rejectUnauthorized: false
      }
    });
  }
  return requestHttpsViaProxy(target, headers, proxy);
}

function requestHttpsViaProxy(target: URL, headers: Record<string, string>, proxy: URL): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const proxyHeaders: Record<string, string> = {
      host: `${target.hostname}:${target.port || '443'}`
    };
    applyProxyAuthorization(proxyHeaders, proxy);
    const transport = proxy.protocol === 'https:' ? https : http;
    const request = transport.request({
      protocol: proxy.protocol,
      hostname: proxy.hostname,
      port: proxy.port || undefined,
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || '443'}`,
      headers: proxyHeaders,
      rejectUnauthorized: false
    });
    const timeout = setTimeout(() => {
      request.destroy(new Error('请求超时'));
    }, 15000);

    request.once('connect', (response, socket) => {
      clearTimeout(timeout);
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`代理 CONNECT 失败：HTTP ${response.statusCode || 0}`));
        return;
      }
      const tlsSocket = tls.connect({
        socket,
        servername: target.hostname,
        rejectUnauthorized: false
      });
      tlsSocket.once('secureConnect', () => {
        writeRawHttpRequest(tlsSocket, target, headers);
        readRawHttpResponse(tlsSocket).then(resolve, reject);
      });
      tlsSocket.once('error', reject);
    });
    request.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    request.end();
  });
}

function nodeRequest(args: { transport: typeof http | typeof https; options: http.RequestOptions | https.RequestOptions }): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = args.transport.request(args.options, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error('请求超时')));
    request.once('error', reject);
    request.end();
  });
}

function writeRawHttpRequest(socket: tls.TLSSocket, target: URL, headers: Record<string, string>): void {
  const path = `${target.pathname}${target.search}`;
  const lines = [
    `GET ${path} HTTP/1.1`,
    ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
    'connection: close',
    '',
    ''
  ];
  socket.write(lines.join('\r\n'));
}

function readRawHttpResponse(socket: tls.TLSSocket): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    socket.setTimeout(15000, () => socket.destroy(new Error('请求超时')));
    socket.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    socket.once('end', () => {
      const raw = Buffer.concat(chunks);
      const separator = raw.indexOf('\r\n\r\n');
      if (separator < 0) {
        reject(new Error('响应格式无效'));
        return;
      }
      const head = raw.slice(0, separator).toString('utf8');
      let body: Buffer = Buffer.from(raw.subarray(separator + 4));
      const statusCode = Number((head.match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/) || [])[1] || 0);
      const headers = parseRawHeaders(head);
      if ((headers['transfer-encoding'] || '').toLocaleLowerCase().includes('chunked')) {
        body = decodeChunkedBody(body);
      }
      resolve({ statusCode, body: body.toString('utf8') });
    });
    socket.once('error', reject);
  });
}

function parseRawHeaders(head: string): Record<string, string> {
  const headers: Record<string, string> = {};
  head.split('\r\n').slice(1).forEach((line) => {
    const separator = line.indexOf(':');
    if (separator > 0) {
      headers[line.slice(0, separator).trim().toLocaleLowerCase()] = line.slice(separator + 1).trim();
    }
  });
  return headers;
}

function decodeChunkedBody(body: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < body.length) {
    const lineEnd = body.indexOf('\r\n', offset);
    if (lineEnd < 0) {
      break;
    }
    const sizeText = body.slice(offset, lineEnd).toString('ascii').split(';')[0].trim();
    const size = Number.parseInt(sizeText, 16);
    if (!Number.isFinite(size) || size < 0) {
      break;
    }
    offset = lineEnd + 2;
    if (size === 0) {
      break;
    }
    chunks.push(body.slice(offset, offset + size));
    offset += size + 2;
  }
  return Buffer.concat(chunks);
}

function parseProxyUrl(proxyUrl: string): URL {
  try {
    const parsed = new URL(proxyUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('代理地址只支持 http 或 https。');
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === '代理地址只支持 http 或 https。') {
      throw error;
    }
    throw new Error(`代理地址无效：${proxyUrl}`);
  }
}

function applyProxyAuthorization(headers: Record<string, string>, proxy: URL): void {
  if (proxy.username || proxy.password) {
    headers['proxy-authorization'] = `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64')}`;
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
