import * as vscode from 'vscode';
import {
  openAgentConfigFile,
  readAgentsState,
  saveClaudeConfig,
  saveCodexConfig,
  saveOpencodeConfig
} from './agentConfigs';
import { deleteProvider, loadProviders, upsertProvider } from './providerStore';
import { getManagerHtml } from './webview';
import { AgentName, WebviewState } from './types';

interface WebviewMessage {
  type: string;
  payload?: unknown;
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new LlmSwitchManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('llm-switch.openManager', () => manager.openPanel()),
    vscode.commands.registerCommand('llm-switch.openClaudeConfig', () => openConfigInEditor('claude')),
    vscode.commands.registerCommand('llm-switch.openCodexConfig', () => openConfigInEditor('codex')),
    vscode.commands.registerCommand('llm-switch.openOpencodeConfig', () => openConfigInEditor('opencode'))
  );
}

export function deactivate(): void {
  // No background resources to release.
}

class LlmSwitchManager {
  private readonly webviews = new Set<vscode.Webview>();
  private panel: vscode.WebviewPanel | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public openPanel(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      void this.postState(this.panel.webview);
      return;
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
      this.panel = undefined;
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
        case 'saveProvider':
          await upsertProvider(this.context, asRecord(message.payload));
          await this.broadcastState('Provider 已保存。');
          return;
        case 'deleteProvider':
          await deleteProvider(this.context, stringField(message.payload, 'id'));
          await this.broadcastState('Provider 已删除。');
          return;
        case 'saveClaude':
          await saveClaudeConfig(loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState('Claude 配置已更新。');
          return;
        case 'saveCodex':
          await saveCodexConfig(loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState('Codex 配置已更新。');
          return;
        case 'saveOpencode':
          await saveOpencodeConfig(loadProviders(this.context), asRecord(message.payload) as never);
          await this.broadcastState('opencode 配置已更新。');
          return;
        case 'openConfig':
          await openConfigInEditor(assertAgentName(stringField(message.payload, 'agent')));
          await this.postState(webview);
          return;
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
    const agents = await readAgentsState(providers);
    return { providers, agents };
  }

  private async postState(webview: vscode.Webview): Promise<void> {
    await webview.postMessage({ type: 'state', state: await this.getState() });
  }

  private async broadcastState(message?: string): Promise<void> {
    const state = await this.getState();
    await Promise.all(Array.from(this.webviews).map(async (webview) => {
      await webview.postMessage({ type: 'state', state });
      if (message) {
        await webview.postMessage({ type: 'notice', message });
      }
    }));
  }
}

async function openConfigInEditor(agent: AgentName): Promise<void> {
  const filePath = await openAgentConfigFile(agent);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(document, { preview: false });
}

function assertAgentName(value: string): AgentName {
  if (value === 'claude' || value === 'codex' || value === 'opencode') {
    return value;
  }
  throw new Error('未知 Agent。');
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
