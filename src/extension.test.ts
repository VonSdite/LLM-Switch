import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import Module from 'node:module';
import * as path from 'node:path';
import test from 'node:test';

const EFFORT_COMMANDS = [
  'llm-switch.setClaudeEffort',
  'llm-switch.setCodexEffort',
  'llm-switch.setOpencodeEffort'
];

const OPENCODE_COMMAND_TITLES = [
  'LLM-Switch: Open Opencode Config',
  'LLM-Switch: Quick Switch Opencode Model',
  'LLM-Switch: Set Opencode Effort'
];

test('package.json 声明三类 Agent 的 effort 命令', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    activationEvents: string[];
    contributes: { commands: Array<{ command: string; title: string }> };
  };
  const contributedCommands = manifest.contributes.commands.map((command) => command.command);
  const contributedTitles = manifest.contributes.commands.map((command) => command.title);

  for (const command of EFFORT_COMMANDS) {
    assert.ok(manifest.activationEvents.includes(`onCommand:${command}`));
    assert.ok(contributedCommands.includes(command));
  }
  for (const title of OPENCODE_COMMAND_TITLES) {
    assert.ok(contributedTitles.includes(title));
  }
});

test('activate 注册三类 Agent 的 effort 命令', () => {
  const registeredCommands: string[] = [];
  const fakeVscode = {
    commands: {
      registerCommand(command: string): { dispose(): void } {
        registeredCommands.push(command);
        return { dispose: () => undefined };
      }
    }
  };
  const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
  (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, ...args: unknown[]): unknown {
    if (request === 'vscode') {
      return fakeVscode;
    }
    return originalLoad.call(this, request, ...args);
  };

  try {
    const extension = require('./extension') as typeof import('./extension');
    extension.activate({ subscriptions: [] } as never);
  } finally {
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = originalLoad;
  }

  for (const command of EFFORT_COMMANDS) {
    assert.ok(registeredCommands.includes(command));
  }
});
