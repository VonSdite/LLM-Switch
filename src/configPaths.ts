import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { readStorageState, writeStorageState } from './storageFiles';
import { AgentName } from './types';

const LEGACY_AGENT_CONFIG_PATHS_KEY = 'agentConfigPaths';
const AGENT_CONFIG_PATHS_STATE_NAME = 'agentConfigPaths';

export type ConfigPathTarget = AgentName | 'codexAuth';

type AgentConfigPathMap = Partial<Record<ConfigPathTarget, string>>;

export interface AgentConfigPathInfo {
  path: string;
  defaultPath: string;
  customPath: string;
  usesDefaultPath: boolean;
}

export async function getAgentConfigPathInfo(context: vscode.ExtensionContext, agent: AgentName): Promise<AgentConfigPathInfo> {
  return getConfigPathInfo(context, agent);
}

export async function getCodexAuthConfigPathInfo(context: vscode.ExtensionContext): Promise<AgentConfigPathInfo> {
  return getConfigPathInfo(context, 'codexAuth');
}

export async function getConfigPathInfo(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<AgentConfigPathInfo> {
  const paths = await loadAgentConfigPaths(context);
  const customPath = typeof paths[target] === 'string' ? paths[target].trim() : '';
  const defaultPath = await getDefaultConfigPath(context, target);

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

export async function getAgentConfigPath(context: vscode.ExtensionContext, agent: AgentName): Promise<string> {
  return (await getAgentConfigPathInfo(context, agent)).path;
}

export async function getCodexAuthConfigPath(context: vscode.ExtensionContext): Promise<string> {
  return (await getCodexAuthConfigPathInfo(context)).path;
}

export async function getConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<string> {
  return (await getConfigPathInfo(context, target)).path;
}

export async function setAgentConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget, configPath: string): Promise<void> {
  const paths = await loadAgentConfigPaths(context);
  const trimmed = configPath.trim();
  const next: AgentConfigPathMap = { ...paths };
  if (trimmed) {
    next[target] = trimmed;
  } else {
    delete next[target];
  }
  await writeAgentConfigPaths(context, next);
}

export async function resetAgentConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<void> {
  await setAgentConfigPath(context, target, '');
}

async function getDefaultConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<string> {
  if (target === 'codexAuth') {
    return path.join(path.dirname(await getAgentConfigPath(context, 'codex')), 'auth.json');
  }
  return getDefaultAgentConfigPath(target);
}

async function loadAgentConfigPaths(context: vscode.ExtensionContext): Promise<AgentConfigPathMap> {
  const state = await readStorageState<AgentConfigPathMap>(context, AGENT_CONFIG_PATHS_STATE_NAME, {});
  if (state.exists) {
    return objectValue(state.value);
  }

  const legacyPaths = objectValue(context.globalState.get<AgentConfigPathMap>(LEGACY_AGENT_CONFIG_PATHS_KEY, {}));
  if (Object.keys(legacyPaths).length > 0) {
    await writeAgentConfigPaths(context, legacyPaths);
  }
  return legacyPaths;
}

async function writeAgentConfigPaths(context: vscode.ExtensionContext, paths: AgentConfigPathMap): Promise<void> {
  await writeStorageState(context, AGENT_CONFIG_PATHS_STATE_NAME, paths);
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

function objectValue(value: unknown): AgentConfigPathMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as AgentConfigPathMap;
}
