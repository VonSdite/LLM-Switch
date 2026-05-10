import * as fs from 'node:fs/promises';
import * as TOML from '@iarna/toml';
import * as vscode from 'vscode';
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';
import { ConfigPathTarget, getAgentConfigPath, getAgentConfigPathInfo, getCodexAuthConfigPath, getCodexAuthConfigPathInfo, getConfigPath } from './configPaths';
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

export async function readAgentsState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<AgentsState> {
  const [claude, codex, opencode] = await Promise.all([
    readClaudeState(context, providers),
    readCodexState(context, providers),
    readOpencodeState(context, providers)
  ]);
  return { claude, codex, opencode };
}

export async function openAgentConfigFiles(context: vscode.ExtensionContext, agent: 'claude' | 'codex' | 'opencode'): Promise<string[]> {
  if (agent === 'codex') {
    const filePaths = [getAgentConfigPath(context, 'codex'), getCodexAuthConfigPath(context)];
    await Promise.all(filePaths.map((filePath) => requireExistingConfigFile(filePath)));
    return filePaths;
  }

  const filePath = getAgentConfigPath(context, agent);
  await requireExistingConfigFile(filePath);
  return [filePath];
}

export async function openConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<string> {
  const filePath = getConfigPath(context, target);
  await requireExistingConfigFile(filePath);
  return filePath;
}

export async function saveClaudeConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveClaudePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'claude');
  const filePath = getAgentConfigPath(context, 'claude');
  await requireExistingConfigFile(filePath);
  const config = await readJsonConfig(filePath, { env: {} });
  const env = ensureObject(config, 'env');

  env.ANTHROPIC_BASE_URL = provider.claudeBaseUrl;
  env.ANTHROPIC_AUTH_TOKEN = provider.apiKey;

  for (const key of CLAUDE_MODEL_KEYS) {
    const model = payload.models[key]?.trim();
    if (model) {
      env[key] = model;
    } else {
      delete env[key];
    }
  }

  await writeText(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

export async function saveCodexConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveCodexPayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'codex');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 Codex 模型。');
  }

  const filePath = getAgentConfigPath(context, 'codex');
  await requireExistingConfigFile(filePath);
  const config = await readTomlConfig(filePath, {});
  const authPath = getCodexAuthConfigPath(context);
  const auth = await readJsonConfig(authPath, {});
  const providerName = provider.name;
  config.model_provider = providerName;
  config.model = model;

  const modelProviders = ensureObject(config, 'model_providers');
  modelProviders[providerName] = {
    name: provider.name,
    base_url: provider.codexBaseUrl,
    wire_api: provider.codexWireApi
  };

  auth.OPENAI_API_KEY = provider.apiKey;

  await writeText(filePath, `${TOML.stringify(config as never)}\n`);
  await writeText(authPath, `${JSON.stringify(auth, null, 2)}\n`);
}

export async function saveOpencodeConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveOpencodePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'opencode');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 opencode 模型。');
  }

  const filePath = getAgentConfigPath(context, 'opencode');
  await requireExistingConfigFile(filePath);
  const config = await readJsonConfig(filePath, { $schema: 'https://opencode.ai/config.json' });
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

async function readClaudeState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<ClaudeAgentState> {
  const pathInfo = getAgentConfigPathInfo(context, 'claude');
  const filePath = pathInfo.path;
  const exists = await fileExists(filePath);
  const baseState: ClaudeAgentState = {
    ...pathInfo,
    path: filePath,
    exists,
    selectedProviderId: '',
    baseUrl: '',
    authToken: '',
    hasAuthToken: false,
    models: emptyClaudeModels()
  };

  try {
    const config = await readJsonConfig(filePath, { env: {} });
    const env = objectValue(config.env);
    const baseUrl = stringValue(env.ANTHROPIC_BASE_URL);
    const authToken = stringValue(env.ANTHROPIC_AUTH_TOKEN);
    const matched = providers.find((provider) => provider.claudeBaseUrl && sameUrl(provider.claudeBaseUrl, baseUrl));
    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      baseUrl,
      authToken,
      hasAuthToken: Boolean(authToken),
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

async function readCodexState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<CodexAgentState> {
  const pathInfo = getAgentConfigPathInfo(context, 'codex');
  const authPathInfo = getCodexAuthConfigPathInfo(context);
  const filePath = pathInfo.path;
  const exists = await fileExists(filePath);
  const authExists = await fileExists(authPathInfo.path);
  const baseState: CodexAgentState = {
    ...pathInfo,
    path: filePath,
    exists,
    selectedProviderId: '',
    modelProvider: '',
    providerName: '',
    providerBaseUrl: '',
    wireApi: '',
    auth: {
      ...authPathInfo,
      path: authPathInfo.path,
      exists: authExists
    },
    openAiApiKey: '',
    hasOpenAiApiKey: false,
    model: ''
  };

  try {
    const config = await readTomlConfig(filePath, {});
    const modelProvider = stringValue(config.model_provider);
    const model = stringValue(config.model);
    const providerBlock = objectValue(objectValue(config.model_providers)[modelProvider]);
    const providerName = stringValue(providerBlock.name);
    const providerBaseUrl = stringValue(providerBlock.base_url);
    const wireApi = stringValue(providerBlock.wire_api);
    const auth = await readJsonConfig(authPathInfo.path, {});
    const openAiApiKey = stringValue(auth.OPENAI_API_KEY);
    const matched = providers.find((provider) => {
      if (!provider.codexBaseUrl) {
        return false;
      }
      return provider.name === modelProvider || provider.key === modelProvider || sameUrl(provider.codexBaseUrl, providerBaseUrl);
    });

    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      modelProvider,
      providerName,
      providerBaseUrl,
      wireApi,
      openAiApiKey,
      hasOpenAiApiKey: Boolean(openAiApiKey),
      model
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readOpencodeState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<OpencodeAgentState> {
  const pathInfo = getAgentConfigPathInfo(context, 'opencode');
  const filePath = pathInfo.path;
  const exists = await fileExists(filePath);
  const baseState: OpencodeAgentState = {
    ...pathInfo,
    path: filePath,
    exists,
    selectedProviderId: '',
    providerKey: '',
    providerName: '',
    providerNpm: '',
    providerBaseUrl: '',
    providerApiKey: '',
    hasProviderApiKey: false,
    providerModelCount: 0,
    model: ''
  };

  try {
    const config = await readJsonConfig(filePath, { $schema: 'https://opencode.ai/config.json' });
    const fullModel = stringValue(config.model);
    const slashIndex = fullModel.indexOf('/');
    const providerKey = slashIndex > 0 ? fullModel.slice(0, slashIndex) : '';
    const model = slashIndex > 0 ? fullModel.slice(slashIndex + 1) : fullModel;
    const providerBlock = objectValue(objectValue(config.provider)[providerKey]);
    const providerOptions = objectValue(providerBlock.options);
    const providerBaseUrl = stringValue(providerOptions.baseURL);
    const providerApiKey = stringValue(providerOptions.apiKey);
    const providerModels = objectValue(providerBlock.models);
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
      providerName: stringValue(providerBlock.name),
      providerNpm: stringValue(providerBlock.npm),
      providerBaseUrl,
      providerApiKey,
      hasProviderApiKey: Boolean(providerApiKey),
      providerModelCount: Object.keys(providerModels).length,
      model
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readJsonConfig(filePath: string, fallback: JsonObject): Promise<JsonObject> {
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

async function readTomlConfig(filePath: string, fallback: JsonObject): Promise<JsonObject> {
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

function ensureObject(parent: JsonObject, key: string): JsonObject {
  const current = parent[key];
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    parent[key] = {};
  }
  return parent[key] as JsonObject;
}

async function requireExistingConfigFile(filePath: string): Promise<void> {
  if (!(await fileExists(filePath))) {
    throw new Error(`配置文件不存在：${filePath}`);
  }
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
