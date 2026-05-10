import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as TOML from '@iarna/toml';
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';
import { getAgentConfigPath } from './configPaths';
import { findProvider } from './providerStore';
import {
  AgentsState,
  CLAUDE_MODEL_KEYS,
  ClaudeAgentState,
  CodexAgentState,
  OpencodeAgentState,
  ProviderConfig,
  SaveClaudePayload,
  SaveCodexPayload,
  SaveOpencodePayload
} from './types';

type JsonObject = Record<string, unknown>;

const CLAUDE_DEFAULT = '{\n  "env": {}\n}\n';
const CODEX_DEFAULT = '';
const OPENCODE_DEFAULT = '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';

export async function readAgentsState(providers: ProviderConfig[]): Promise<AgentsState> {
  const [claude, codex, opencode] = await Promise.all([
    readClaudeState(providers),
    readCodexState(providers),
    readOpencodeState(providers)
  ]);
  return { claude, codex, opencode };
}

export async function openAgentConfigFile(agent: 'claude' | 'codex' | 'opencode'): Promise<string> {
  const filePath = getAgentConfigPath(agent);
  const defaults = agent === 'claude' ? CLAUDE_DEFAULT : agent === 'codex' ? CODEX_DEFAULT : OPENCODE_DEFAULT;
  await ensureFile(filePath, defaults);
  return filePath;
}

export async function saveClaudeConfig(providers: ProviderConfig[], payload: SaveClaudePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'claude');
  const filePath = getAgentConfigPath('claude');
  const config = await readJsonConfig(filePath, { env: {} }, CLAUDE_DEFAULT);
  const env = ensureObject(config, 'env');

  env.ANTHROPIC_BASE_URL = provider.claudeBaseUrl;
  env.ANTHROPIC_AUTH_TOKEN = provider.apiKey;
  env.NODE_TLS_REJECT_UNAUTHORIZED = provider.sslCheck ? '1' : '0';
  applyProxyEnv(env, provider);

  for (const key of CLAUDE_MODEL_KEYS) {
    const model = payload.models[key]?.trim();
    if (model) {
      env[key] = model;
    }
  }

  await writeText(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

export async function saveCodexConfig(providers: ProviderConfig[], payload: SaveCodexPayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'codex');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 Codex 模型。');
  }

  const filePath = getAgentConfigPath('codex');
  const config = await readTomlConfig(filePath, {}, CODEX_DEFAULT);
  config.model_provider = provider.key;
  config.model = model;

  const modelProviders = ensureObject(config, 'model_providers');
  modelProviders[provider.key] = {
    name: provider.name,
    base_url: provider.codexBaseUrl,
    wire_api: provider.codexWireApi
  };

  await writeText(filePath, `${TOML.stringify(config as never)}\n`);
}

export async function saveOpencodeConfig(providers: ProviderConfig[], payload: SaveOpencodePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'opencode');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 opencode 模型。');
  }

  const filePath = getAgentConfigPath('opencode');
  const config = await readJsonConfig(filePath, { $schema: 'https://opencode.ai/config.json' }, OPENCODE_DEFAULT);
  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }

  const providerRoot = ensureObject(config, 'provider');
  const modelNames = provider.models.includes(model) ? provider.models : [model, ...provider.models];
  const models: JsonObject = {};
  for (const name of modelNames) {
    models[name] = { name };
  }

  const options: JsonObject = {
    baseURL: provider.opencodeBaseUrl
  };
  if (provider.apiKey) {
    options.apiKey = provider.apiKey;
  }

  providerRoot[provider.key] = {
    npm: '@ai-sdk/openai-compatible',
    name: provider.name,
    options,
    models
  };
  config.model = `${provider.key}/${model}`;

  await writeText(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

async function readClaudeState(providers: ProviderConfig[]): Promise<ClaudeAgentState> {
  const filePath = getAgentConfigPath('claude');
  const exists = await fileExists(filePath);
  const baseState: ClaudeAgentState = {
    path: filePath,
    exists,
    selectedProviderId: '',
    baseUrl: '',
    hasAuthToken: false,
    models: emptyClaudeModels()
  };

  try {
    const config = await readJsonConfig(filePath, { env: {} }, CLAUDE_DEFAULT, false);
    const env = objectValue(config.env);
    const baseUrl = stringValue(env.ANTHROPIC_BASE_URL);
    const matched = providers.find((provider) => provider.claudeBaseUrl && sameUrl(provider.claudeBaseUrl, baseUrl));
    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      baseUrl,
      hasAuthToken: Boolean(stringValue(env.ANTHROPIC_AUTH_TOKEN)),
      models: Object.fromEntries(
        CLAUDE_MODEL_KEYS.map((key) => [key, stringValue(env[key])])
      ) as ClaudeAgentState['models']
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readCodexState(providers: ProviderConfig[]): Promise<CodexAgentState> {
  const filePath = getAgentConfigPath('codex');
  const exists = await fileExists(filePath);
  const baseState: CodexAgentState = {
    path: filePath,
    exists,
    selectedProviderId: '',
    modelProvider: '',
    providerBaseUrl: '',
    wireApi: '',
    model: ''
  };

  try {
    const config = await readTomlConfig(filePath, {}, CODEX_DEFAULT, false);
    const modelProvider = stringValue(config.model_provider);
    const model = stringValue(config.model);
    const providerBlock = objectValue(objectValue(config.model_providers)[modelProvider]);
    const providerBaseUrl = stringValue(providerBlock.base_url);
    const wireApi = stringValue(providerBlock.wire_api);
    const matched = providers.find((provider) => {
      if (!provider.codexBaseUrl) {
        return false;
      }
      return provider.key === modelProvider || sameUrl(provider.codexBaseUrl, providerBaseUrl);
    });

    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      modelProvider,
      providerBaseUrl,
      wireApi,
      model
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readOpencodeState(providers: ProviderConfig[]): Promise<OpencodeAgentState> {
  const filePath = getAgentConfigPath('opencode');
  const exists = await fileExists(filePath);
  const baseState: OpencodeAgentState = {
    path: filePath,
    exists,
    selectedProviderId: '',
    providerKey: '',
    providerBaseUrl: '',
    model: ''
  };

  try {
    const config = await readJsonConfig(filePath, { $schema: 'https://opencode.ai/config.json' }, OPENCODE_DEFAULT, false);
    const fullModel = stringValue(config.model);
    const slashIndex = fullModel.indexOf('/');
    const providerKey = slashIndex > 0 ? fullModel.slice(0, slashIndex) : '';
    const model = slashIndex > 0 ? fullModel.slice(slashIndex + 1) : fullModel;
    const providerBlock = objectValue(objectValue(config.provider)[providerKey]);
    const providerBaseUrl = stringValue(objectValue(providerBlock.options).baseURL);
    const matched = providers.find((provider) => {
      if (!provider.opencodeBaseUrl) {
        return false;
      }
      return provider.key === providerKey || sameUrl(provider.opencodeBaseUrl, providerBaseUrl);
    });

    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      providerKey,
      providerBaseUrl,
      model
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readJsonConfig(filePath: string, fallback: JsonObject, defaultText: string, createIfMissing = true): Promise<JsonObject> {
  if (createIfMissing) {
    await ensureFile(filePath, defaultText);
  }
  const text = await readTextIfExists(filePath);
  if (!text.trim()) {
    return { ...fallback };
  }

  const errors: ParseError[] = [];
  const parsed = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const error = errors[0];
    throw new Error(`JSON 解析失败：${printParseErrorCode(error.error)}，offset ${error.offset}。`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('配置文件必须是 JSON object。');
  }
  return parsed as JsonObject;
}

async function readTomlConfig(filePath: string, fallback: JsonObject, defaultText: string, createIfMissing = true): Promise<JsonObject> {
  if (createIfMissing) {
    await ensureFile(filePath, defaultText);
  }
  const text = await readTextIfExists(filePath);
  if (!text.trim()) {
    return { ...fallback };
  }

  const parsed = TOML.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('配置文件必须是 TOML object。');
  }
  return parsed as JsonObject;
}

function applyProxyEnv(env: JsonObject, provider: ProviderConfig): void {
  const proxyKeys = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'];
  for (const key of proxyKeys) {
    delete env[key];
  }

  if (provider.proxyMode === 'custom' && provider.customProxyUrl) {
    env.HTTP_PROXY = provider.customProxyUrl;
    env.HTTPS_PROXY = provider.customProxyUrl;
  }
}

function ensureObject(parent: JsonObject, key: string): JsonObject {
  const current = parent[key];
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    parent[key] = {};
  }
  return parent[key] as JsonObject;
}

async function ensureFile(filePath: string, defaultText: string): Promise<void> {
  if (await fileExists(filePath)) {
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, defaultText, 'utf8');
}

async function readTextIfExists(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (isNotFound(error)) {
      return '';
    }
    throw error;
  }
}

async function writeText(filePath: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sameUrl(left: string, right: string): boolean {
  return stripTrailingSlash(left.trim()) === stripTrailingSlash(right.trim());
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '');
}

function emptyClaudeModels(): ClaudeAgentState['models'] {
  return Object.fromEntries(CLAUDE_MODEL_KEYS.map((key) => [key, ''])) as ClaudeAgentState['models'];
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT');
}
