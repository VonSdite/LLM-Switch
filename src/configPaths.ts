import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { AgentName } from './types';

const CONFIG_SECTION = 'llmSwitch';

export function getAgentConfigPath(agent: AgentName): string {
  const configured = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>(`${agent}.configPath`, '')
    .trim();

  if (configured.length > 0) {
    return expandPath(configured);
  }

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
