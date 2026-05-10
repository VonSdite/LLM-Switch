import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { AgentName } from './types';

const AGENT_CONFIG_PATHS_KEY = 'agentConfigPaths';

export type ConfigPathTarget = AgentName | 'codexAuth';

type AgentConfigPathMap = Partial<Record<ConfigPathTarget, string>>;

export interface AgentConfigPathInfo {
  path: string;
  defaultPath: string;
  customPath: string;
  usesDefaultPath: boolean;
}

export function getAgentConfigPathInfo(context: vscode.ExtensionContext, agent: AgentName): AgentConfigPathInfo {
  return getConfigPathInfo(context, agent);
}

export function getCodexAuthConfigPathInfo(context: vscode.ExtensionContext): AgentConfigPathInfo {
  return getConfigPathInfo(context, 'codexAuth');
}

export function getConfigPathInfo(context: vscode.ExtensionContext, target: ConfigPathTarget): AgentConfigPathInfo {
  const paths = context.globalState.get<AgentConfigPathMap>(AGENT_CONFIG_PATHS_KEY, {});
  const customPath = typeof paths[target] === 'string' ? paths[target].trim() : '';
  const defaultPath = getDefaultConfigPath(context, target);

  if (customPath) {
    return {
      path: expandPath(customPath),
      defaultPath,
      customPath,
      usesDefaultPath: false
    };
  }

  return {
    path: defaultPath,
    defaultPath,
    customPath: '',
    usesDefaultPath: true
  };
}

export function getAgentConfigPath(context: vscode.ExtensionContext, agent: AgentName): string {
  return getAgentConfigPathInfo(context, agent).path;
}

export function getCodexAuthConfigPath(context: vscode.ExtensionContext): string {
  return getCodexAuthConfigPathInfo(context).path;
}

export function getConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): string {
  return getConfigPathInfo(context, target).path;
}

export async function setAgentConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget, configPath: string): Promise<void> {
  const paths = context.globalState.get<AgentConfigPathMap>(AGENT_CONFIG_PATHS_KEY, {});
  const trimmed = configPath.trim();
  const next: AgentConfigPathMap = { ...paths };
  if (trimmed) {
    next[target] = trimmed;
  } else {
    delete next[target];
  }
  await context.globalState.update(AGENT_CONFIG_PATHS_KEY, next);
}

export async function resetAgentConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<void> {
  await setAgentConfigPath(context, target, '');
}

function getDefaultConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): string {
  if (target === 'codexAuth') {
    return path.join(path.dirname(getAgentConfigPath(context, 'codex')), 'auth.json');
  }
  return getDefaultAgentConfigPath(target);
}

function getDefaultAgentConfigPath(agent: AgentName): string {
  const home = os.homedir();
  if (agent === 'claude') {
    return path.join(home, '.claude', 'settings.json');
  }
  if (agent === 'codex') {
    return path.join(home, '.codex', 'config.toml');
  }
  return path.join(home, '.config', 'opencode', 'opencode.json');
}

function expandPath(input: string): string {
  let expanded = input;
  if (expanded === '~' || expanded.startsWith(`~${path.sep}`) || expanded.startsWith('~/')) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }

  expanded = expanded.replace(/%([^%]+)%/g, (_match, name: string) => process.env[name] ?? _match);
  expanded = expanded.replace(/\$\{([^}]+)\}/g, (_match, name: string) => process.env[name] ?? _match);
  expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => process.env[name] ?? _match);

  return path.resolve(expanded);
}
