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
