import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import { CodexWireApi, ProviderConfig, ProxyMode } from './types';

const PROVIDERS_KEY = 'providers';
const PROVIDER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const PROVIDER_NAME_ERROR = 'Provider 名称只能包含英文字母、数字、下划线和中划线，长度 1-64，且必须以字母或数字开头。';

interface ProviderInput {
  id?: string;
  name?: string;
  apiKey?: string;
  proxyMode?: ProxyMode;
  customProxyUrl?: string;
  sslCheck?: boolean;
  models?: string[] | string;
  claudeBaseUrl?: string;
  codexBaseUrl?: string;
  codexWireApi?: CodexWireApi;
  opencodeBaseUrl?: string;
}

export function loadProviders(context: vscode.ExtensionContext): ProviderConfig[] {
  const stored = context.globalState.get<unknown[]>(PROVIDERS_KEY, []);
  if (!Array.isArray(stored)) {
    return [];
  }

  const providers: ProviderConfig[] = [];
  for (const item of stored) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const name = stringValue(raw.name).trim();
    if (!name) {
      continue;
    }
    const id = stringValue(raw.id) || randomUUID();
    const key = stringValue(raw.key) || uniqueProviderKey(name, providers);
    providers.push({
      id,
      key,
      name,
      apiKey: stringValue(raw.apiKey),
      proxyMode: normalizeProxyMode(raw.proxyMode),
      customProxyUrl: stringValue(raw.customProxyUrl),
      sslCheck: typeof raw.sslCheck === 'boolean' ? raw.sslCheck : false,
      models: normalizeModels(raw.models),
      claudeBaseUrl: stringValue(raw.claudeBaseUrl),
      codexBaseUrl: stringValue(raw.codexBaseUrl),
      codexWireApi: normalizeWireApi(raw.codexWireApi),
      opencodeBaseUrl: stringValue(raw.opencodeBaseUrl)
    });
  }
  return providers;
}

export async function saveProviders(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<void> {
  await context.globalState.update(PROVIDERS_KEY, providers);
}

export async function upsertProvider(context: vscode.ExtensionContext, input: ProviderInput): Promise<ProviderConfig[]> {
  const providers = loadProviders(context);
  const name = stringValue(input.name).trim();
  if (!name) {
    throw new Error('Provider 名称必填。');
  }
  if (!isValidProviderName(name)) {
    throw new Error(PROVIDER_NAME_ERROR);
  }
  if (providers.some((provider) => provider.id !== input.id && sameProviderName(provider.name, name))) {
    throw new Error('Provider 名称不能重复。');
  }

  const proxyMode = normalizeProxyMode(input.proxyMode);
  const customProxyUrl = stringValue(input.customProxyUrl).trim();
  if (proxyMode === 'custom' && !customProxyUrl) {
    throw new Error('自定义代理模式需要填写代理地址。');
  }

  const existingIndex = input.id ? providers.findIndex((provider) => provider.id === input.id) : -1;
  const existing = existingIndex >= 0 ? providers[existingIndex] : undefined;
  const provider: ProviderConfig = {
    id: existing?.id ?? randomUUID(),
    key: existing?.key ?? uniqueProviderKey(name, providers),
    name,
    apiKey: stringValue(input.apiKey),
    proxyMode,
    customProxyUrl: proxyMode === 'custom' ? customProxyUrl : '',
    sslCheck: typeof input.sslCheck === 'boolean' ? input.sslCheck : false,
    models: normalizeModels(input.models),
    claudeBaseUrl: stringValue(input.claudeBaseUrl).trim(),
    codexBaseUrl: stringValue(input.codexBaseUrl).trim(),
    codexWireApi: normalizeWireApi(input.codexWireApi),
    opencodeBaseUrl: stringValue(input.opencodeBaseUrl).trim()
  };

  if (existingIndex >= 0) {
    providers[existingIndex] = provider;
  } else {
    providers.push(provider);
  }
  await saveProviders(context, providers);
  return providers;
}

export async function deleteProvider(context: vscode.ExtensionContext, id: string): Promise<ProviderConfig[]> {
  const providers = loadProviders(context).filter((provider) => provider.id !== id);
  await saveProviders(context, providers);
  return providers;
}

export async function reorderProviders(context: vscode.ExtensionContext, orderedIds: string[]): Promise<ProviderConfig[]> {
  const providers = loadProviders(context);
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  const reordered: ProviderConfig[] = [];

  for (const id of orderedIds) {
    const provider = byId.get(id);
    if (provider && !reordered.includes(provider)) {
      reordered.push(provider);
    }
  }

  for (const provider of providers) {
    if (!reordered.includes(provider)) {
      reordered.push(provider);
    }
  }

  await saveProviders(context, reordered);
  return reordered;
}

export function findProvider(providers: ProviderConfig[], providerId: string, agent: 'claude' | 'codex' | 'opencode'): ProviderConfig {
  const provider = providers.find((item) => item.id === providerId);
  if (!provider) {
    throw new Error('未找到选择的 Provider。');
  }
  if (agent === 'claude' && !provider.claudeBaseUrl) {
    throw new Error('该 Provider 未配置 Claude API 地址。');
  }
  if (agent === 'codex' && !provider.codexBaseUrl) {
    throw new Error('该 Provider 未配置 Codex API 地址。');
  }
  if (agent === 'opencode' && !provider.opencodeBaseUrl) {
    throw new Error('该 Provider 未配置 opencode API 地址。');
  }
  return provider;
}

function uniqueProviderKey(name: string, providers: ProviderConfig[]): string {
  const base = slugProviderKey(name);
  const used = new Set(providers.map((provider) => provider.key));
  if (!used.has(base)) {
    return base;
  }
  let index = 2;
  while (used.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function slugProviderKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'provider';
}

function sameProviderName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function isValidProviderName(name: string): boolean {
  return PROVIDER_NAME_PATTERN.test(name);
}

function normalizeModels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupe(value.map((item) => stringValue(item).trim()).filter(Boolean));
  }
  if (typeof value === 'string') {
    return dedupe(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean));
  }
  return [];
}

function normalizeProxyMode(value: unknown): ProxyMode {
  if (value === 'direct' || value === 'system' || value === 'custom') {
    return value;
  }
  return 'direct';
}

function normalizeWireApi(value: unknown): CodexWireApi {
  return value === 'chat' ? 'chat' : 'responses';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}
