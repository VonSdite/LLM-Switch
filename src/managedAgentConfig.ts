import * as vscode from 'vscode';
import { currentManagedPaths, ManagedField } from './managedFields';
import { readStorageState, writeStorageState } from './storageFiles';

export { ManagedField, reconcileManagedFields } from './managedFields';

interface ManagedAgentConfigState {
  version: 1;
  targets: Record<string, ManagedField[]>;
}

const STATE_NAME = 'managedAgentConfig';

export function managedTargetId(agent: 'claude' | 'codex' | 'codexAuth' | 'opencode', filePath: string): string {
  return `${agent}:${filePath}`;
}

export async function readManagedFields(context: vscode.ExtensionContext, targetId: string): Promise<ManagedField[]> {
  const state = await loadManagedState(context);
  return normalizeManagedFields(state.targets[targetId]);
}

export async function readManagedPaths(context: vscode.ExtensionContext, targetId: string, config: Record<string, unknown>): Promise<string[]> {
  return currentManagedPaths(config, await readManagedFields(context, targetId));
}

export async function updateManagedFields(context: vscode.ExtensionContext, updates: Array<{ targetId: string; fields: ManagedField[] }>): Promise<void> {
  const state = await loadManagedState(context);
  for (const update of updates) {
    state.targets[update.targetId] = normalizeManagedFields(update.fields);
  }
  await writeStorageState(context, STATE_NAME, state);
}

async function loadManagedState(context: vscode.ExtensionContext): Promise<ManagedAgentConfigState> {
  const stored = await readStorageState<unknown>(context, STATE_NAME, { version: 1, targets: {} });
  if (!stored.value || typeof stored.value !== 'object' || Array.isArray(stored.value)) {
    return { version: 1, targets: {} };
  }
  const raw = stored.value as Record<string, unknown>;
  const rawTargets = raw.targets && typeof raw.targets === 'object' && !Array.isArray(raw.targets)
    ? raw.targets as Record<string, unknown>
    : {};
  const targets: Record<string, ManagedField[]> = {};
  for (const [targetId, fields] of Object.entries(rawTargets)) {
    targets[targetId] = normalizeManagedFields(fields);
  }
  return { version: 1, targets };
}

function normalizeManagedFields(value: unknown): ManagedField[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (!Array.isArray(raw.path) || !raw.path.every((segment) => typeof segment === 'string' && segment)) {
      return [];
    }
    return [{ path: raw.path as string[], value: raw.value }];
  });
}
