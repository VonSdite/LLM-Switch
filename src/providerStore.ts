import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import { CodexWireApi, ProviderConfig, ProxyMode } from './types';

const PROVIDERS_KEY = 'providers';

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
    customProxyUrl,
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
  return Array.from(new Set(values));
}
