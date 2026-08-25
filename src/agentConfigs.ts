import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as TOML from '@iarna/toml';
import * as vscode from 'vscode';
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';
import { ConfigPathTarget, getAgentConfigPath, getAgentConfigPathInfo, getCodexAuthConfigPath, getCodexAuthConfigPathInfo, getConfigPath } from './configPaths';
import { ManagedField, managedTargetId, readManagedFields, readManagedPaths, reconcileManagedFields, updateManagedFields } from './managedAgentConfig';
import { calculateModelLimits } from './modelPresets';
import { findProvider, findProviderModel } from './providerStore';
import {
  AgentsState,
  CLAUDE_MODEL_KEYS,
  ClaudeAgentState,
  ClaudeRuntimeSettings,
  ClaudeSettingMode,
  CodexAgentState,
  CodexApprovalPolicy,
  CodexRuntimeSettings,
  CodexSandboxMode,
  CodexServiceTier,
  OpencodeAgentState,
  ProviderConfig,
  SaveClaudePayload,
  SaveCodexPayload,
  SaveOpencodePayload
} from './types';

type JsonObject = Record<string, unknown>;
const MAX_BACKUP_FILES = 5;
const CODEX_SERVICE_TIERS: readonly CodexServiceTier[] = ['auto', 'default', 'flex', 'priority'];
const CODEX_SANDBOX_MODES: readonly CodexSandboxMode[] = ['read-only', 'workspace-write', 'danger-full-access'];
const CODEX_APPROVAL_POLICIES: readonly CodexApprovalPolicy[] = ['untrusted', 'on-request', 'never'];

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
    const filePaths = [await getAgentConfigPath(context, 'codex'), await getCodexAuthConfigPath(context)];
    await Promise.all(filePaths.map((filePath) => requireExistingConfigFile(filePath)));
    return filePaths;
  }

  const filePath = await getAgentConfigPath(context, agent);
  await requireExistingConfigFile(filePath);
  return [filePath];
}

export async function openConfigPath(context: vscode.ExtensionContext, target: ConfigPathTarget): Promise<string> {
  const filePath = await getConfigPath(context, target);
  await requireExistingConfigFile(filePath);
  return filePath;
}

export async function saveClaudeConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveClaudePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'claude');
  const filePath = await getAgentConfigPath(context, 'claude');
  await requireExistingConfigFile(filePath);
  const config = await readJsonConfig(filePath, { env: {} });
  const desired: ManagedField[] = [managedField(['env', 'ANTHROPIC_BASE_URL'], provider.claudeBaseUrl)];
  if (provider.apiKey) {
    desired.push(managedField(['env', 'ANTHROPIC_AUTH_TOKEN'], provider.apiKey));
  }
  for (const key of CLAUDE_MODEL_KEYS) {
    const model = payload.models[key]?.trim();
    if (model) {
      desired.push(managedField(['env', key], model));
    }
  }

  const mainModel = payload.models.ANTHROPIC_MODEL?.trim()
    || CLAUDE_MODEL_KEYS.map((key) => payload.models[key]?.trim()).find(Boolean)
    || '';
  const modelConfig = mainModel ? findProviderModel(provider, mainModel) : undefined;
  const runtimeSettings = normalizeClaudeRuntimeSettings(payload.runtimeSettings);
  const compactThresholdPercent = modelConfig?.compactThresholdPercent ?? runtimeSettings.autoCompactPctOverride;
  const preservedPaths = new Set<string>();
  if (modelConfig?.contextWindow) {
    desired.push(managedField(['env', 'CLAUDE_CODE_AUTO_COMPACT_WINDOW'], String(modelConfig.contextWindow)));
  } else {
    preservedPaths.add(JSON.stringify(['env', 'CLAUDE_CODE_AUTO_COMPACT_WINDOW']));
  }
  if (compactThresholdPercent !== undefined) {
    desired.push(managedField(['env', 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE'], String(compactThresholdPercent)));
  } else {
    preservedPaths.add(JSON.stringify(['env', 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE']));
  }
  if (modelConfig?.maxOutputTokens) {
    desired.push(managedField(['env', 'CLAUDE_CODE_MAX_OUTPUT_TOKENS'], String(modelConfig.maxOutputTokens)));
  }
  pushClaudeModeField(desired, ['env', 'CLAUDE_CODE_ATTRIBUTION_HEADER'], runtimeSettings.attributionHeader, '1', '0');
  pushClaudeModeField(desired, ['env', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'], runtimeSettings.disableNonessentialTraffic, '1', '0');
  pushClaudeModeField(desired, ['env', 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'], runtimeSettings.experimentalAgentTeams, '1', '0');
  pushClaudeModeField(desired, ['env', 'ENABLE_TOOL_SEARCH'], runtimeSettings.enableToolSearch, 'true', 'false');
  pushClaudeModeField(desired, ['env', 'IS_SANDBOX'], runtimeSettings.sandbox, '1', '0');

  const targetId = managedTargetId('claude', filePath);
  const previous = await readManagedFields(context, targetId);
  reconcileManagedFields(config, previous.filter((field) => !preservedPaths.has(JSON.stringify(field.path))), desired);

  await writeText(filePath, `${JSON.stringify(config, null, 2)}\n`);
  await updateManagedFields(context, [{ targetId, fields: desired }]);
}

export async function saveCodexConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveCodexPayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'codex');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 Codex 模型。');
  }

  const filePath = await getAgentConfigPath(context, 'codex');
  await requireExistingConfigFile(filePath);
  const config = await readTomlConfig(filePath, {});
  const authPath = await getCodexAuthConfigPath(context);
  const auth = await readJsonConfig(authPath, {});
  const providerName = provider.name;
  const configDesired: ManagedField[] = [
    managedField(['model_provider'], providerName),
    managedField(['model'], model),
    managedField(['model_providers', providerName, 'name'], provider.name),
    managedField(['model_providers', providerName, 'base_url'], provider.codexBaseUrl),
    managedField(['model_providers', providerName, 'wire_api'], provider.codexWireApi),
    managedField(['model_providers', providerName, 'requires_openai_auth'], Boolean(provider.apiKey))
  ];
  const modelConfig = findProviderModel(provider, model);
  if (modelConfig?.contextWindow) {
    configDesired.push(managedField(['model_context_window'], modelConfig.contextWindow));
    const compactAtTokens = calculateModelLimits(modelConfig).compactAtTokens;
    if (compactAtTokens !== undefined) {
      configDesired.push(managedField(['model_auto_compact_token_limit'], compactAtTokens));
    }
  }
  const runtimeSettings = normalizeCodexRuntimeSettings(payload.runtimeSettings);
  if (runtimeSettings.serviceTier) {
    configDesired.push(managedField(['service_tier'], runtimeSettings.serviceTier));
  }
  if (runtimeSettings.sandboxMode) {
    configDesired.push(managedField(['sandbox_mode'], runtimeSettings.sandboxMode));
  }
  if (runtimeSettings.approvalPolicy) {
    configDesired.push(managedField(['approval_policy'], runtimeSettings.approvalPolicy));
  }
  const authDesired = provider.apiKey ? [managedField(['OPENAI_API_KEY'], provider.apiKey)] : [];
  const configTargetId = managedTargetId('codex', filePath);
  const authTargetId = managedTargetId('codexAuth', authPath);
  reconcileManagedFields(config, await readManagedFields(context, configTargetId), configDesired);
  reconcileManagedFields(auth, await readManagedFields(context, authTargetId), authDesired);

  await writeText(filePath, `${TOML.stringify(config as never)}\n`);
  await writeText(authPath, `${JSON.stringify(auth, null, 2)}\n`);
  await updateManagedFields(context, [
    { targetId: configTargetId, fields: configDesired },
    { targetId: authTargetId, fields: authDesired }
  ]);
}

export async function saveOpencodeConfig(context: vscode.ExtensionContext, providers: ProviderConfig[], payload: SaveOpencodePayload): Promise<void> {
  const provider = findProvider(providers, payload.providerId, 'opencode');
  const model = payload.model.trim();
  if (!model) {
    throw new Error('请选择 opencode 模型。');
  }
  const selectedModelConfig = findProviderModel(provider, model);

  const filePath = await getAgentConfigPath(context, 'opencode');
  await requireExistingConfigFile(filePath);
  const config = await readJsonConfig(filePath, { $schema: 'https://opencode.ai/config.json' });
  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }

  const desired: ManagedField[] = [
    managedField(['model'], `${provider.key}/${model}`),
    managedField(['provider', provider.key, 'npm'], provider.opencodeNpm),
    managedField(['provider', provider.key, 'name'], provider.name),
    managedField(['provider', provider.key, 'options', 'baseURL'], provider.opencodeBaseUrl)
  ];
  const reserved = selectedModelConfig ? calculateModelLimits(selectedModelConfig).reserved : undefined;
  if (reserved !== undefined) {
    desired.push(managedField(['compaction', 'reserved'], reserved));
  }
  if (provider.apiKey) {
    desired.push(managedField(['provider', provider.key, 'options', 'apiKey'], provider.apiKey));
  }
  for (const configuredModel of provider.models) {
    const limit: { context?: number; output?: number } = {};
    if (configuredModel.contextWindow) {
      limit.context = configuredModel.contextWindow;
    }
    if (configuredModel.maxOutputTokens) {
      limit.output = configuredModel.maxOutputTokens;
    }
    const modelDefinition: { name: string; limit?: typeof limit } = {
      name: configuredModel.id
    };
    if (Object.keys(limit).length > 0) {
      modelDefinition.limit = limit;
    }
    desired.push(managedField(['provider', provider.key, 'models', configuredModel.id], modelDefinition));
  }

  const targetId = managedTargetId('opencode', filePath);
  reconcileManagedFields(config, await readManagedFields(context, targetId), desired);

  await writeText(filePath, `${JSON.stringify(config, null, 2)}\n`);
  await updateManagedFields(context, [{ targetId, fields: desired }]);
}

async function readClaudeState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<ClaudeAgentState> {
  const pathInfo = await getAgentConfigPathInfo(context, 'claude');
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
    models: emptyClaudeModels(),
    autoCompactWindow: null,
    maxOutputTokens: null,
    runtimeSettings: emptyClaudeRuntimeSettings()
  };

  try {
    const config = await readJsonConfig(filePath, { env: {} });
    const env = objectValue(config.env);
    const baseUrl = stringValue(env.ANTHROPIC_BASE_URL);
    const authToken = stringValue(env.ANTHROPIC_AUTH_TOKEN);
    const targetId = managedTargetId('claude', filePath);
    const matched = providers.find((provider) => provider.claudeBaseUrl && sameUrl(provider.claudeBaseUrl, baseUrl));
    return {
      ...baseState,
      selectedProviderId: matched?.id ?? '',
      baseUrl,
      authToken,
      hasAuthToken: Boolean(authToken),
      models: Object.fromEntries(
        CLAUDE_MODEL_KEYS.map((key) => [key, stringValue(env[key])])
      ) as ClaudeAgentState['models'],
      autoCompactWindow: positiveIntegerOrUndefined(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW) ?? null,
      maxOutputTokens: positiveIntegerOrUndefined(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) ?? null,
      runtimeSettings: {
        autoCompactPctOverride: positiveIntegerOrUndefined(env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE),
        attributionHeader: claudeModeFromValue(env.CLAUDE_CODE_ATTRIBUTION_HEADER, '1', '0'),
        disableNonessentialTraffic: claudeModeFromValue(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC, '1', '0'),
        experimentalAgentTeams: claudeModeFromValue(env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, '1', '0'),
        enableToolSearch: claudeModeFromValue(env.ENABLE_TOOL_SEARCH, 'true', 'false'),
        sandbox: claudeModeFromValue(env.IS_SANDBOX, '1', '0')
      },
      managedPaths: await readManagedPaths(context, targetId, config)
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readCodexState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<CodexAgentState> {
  const pathInfo = await getAgentConfigPathInfo(context, 'codex');
  const authPathInfo = await getCodexAuthConfigPathInfo(context);
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
    requiresOpenAiAuth: null,
    auth: {
      ...authPathInfo,
      path: authPathInfo.path,
      exists: authExists
    },
    openAiApiKey: '',
    hasOpenAiApiKey: false,
    model: '',
    modelContextWindow: null,
    modelAutoCompactTokenLimit: null,
    runtimeSettings: {}
  };

  try {
    const config = await readTomlConfig(filePath, {});
    const modelProvider = stringValue(config.model_provider);
    const model = stringValue(config.model);
    const providerBlock = objectValue(objectValue(config.model_providers)[modelProvider]);
    const providerName = stringValue(providerBlock.name);
    const providerBaseUrl = stringValue(providerBlock.base_url);
    const wireApi = stringValue(providerBlock.wire_api);
    const requiresOpenAiAuth = booleanOrNull(providerBlock.requires_openai_auth);
    const auth = await readJsonConfig(authPathInfo.path, {});
    const openAiApiKey = stringValue(auth.OPENAI_API_KEY);
    const configTargetId = managedTargetId('codex', filePath);
    const authTargetId = managedTargetId('codexAuth', authPathInfo.path);
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
      requiresOpenAiAuth,
      openAiApiKey,
      hasOpenAiApiKey: Boolean(openAiApiKey),
      model,
      modelContextWindow: numberOrNull(config.model_context_window),
      modelAutoCompactTokenLimit: numberOrNull(config.model_auto_compact_token_limit),
      runtimeSettings: {
        serviceTier: knownString(config.service_tier, CODEX_SERVICE_TIERS),
        sandboxMode: knownString(config.sandbox_mode, CODEX_SANDBOX_MODES),
        approvalPolicy: knownString(config.approval_policy, CODEX_APPROVAL_POLICIES)
      },
      managedPaths: await readManagedPaths(context, configTargetId, config),
      auth: {
        ...baseState.auth,
        managedPaths: await readManagedPaths(context, authTargetId, auth)
      }
    };
  } catch (error) {
    return {
      ...baseState,
      parseError: errorMessage(error)
    };
  }
}

async function readOpencodeState(context: vscode.ExtensionContext, providers: ProviderConfig[]): Promise<OpencodeAgentState> {
  const pathInfo = await getAgentConfigPathInfo(context, 'opencode');
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
    model: '',
    modelContextWindow: null,
    maxOutputTokens: null,
    compactionReserved: null
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
    const selectedModelBlock = objectValue(providerModels[model]);
    const selectedLimit = objectValue(selectedModelBlock.limit);
    const targetId = managedTargetId('opencode', filePath);
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
      model,
      modelContextWindow: numberOrNull(selectedLimit.context),
      maxOutputTokens: numberOrNull(selectedLimit.output),
      compactionReserved: numberOrNull(objectValue(config.compaction).reserved),
      managedPaths: await readManagedPaths(context, targetId, config)
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
  const existed = await fileExists(filePath);
  const currentText = existed ? await fs.readFile(filePath, 'utf8') : '';
  if (currentText === text) {
    return;
  }
  if (existed) {
    await createConfigBackup(filePath);
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
}

async function createConfigBackup(filePath: string): Promise<void> {
  for (let index = MAX_BACKUP_FILES; index >= 1; index -= 1) {
    const backupPath = backupFilePath(filePath, index);
    if (!(await fileExists(backupPath))) {
      continue;
    }
    if (index === MAX_BACKUP_FILES) {
      await fs.unlink(backupPath);
    } else {
      await fs.rename(backupPath, backupFilePath(filePath, index + 1));
    }
  }
  await fs.copyFile(filePath, backupFilePath(filePath, 1));
}

function backupFilePath(filePath: string, index: number): string {
  return `${filePath}.bak.${index}`;
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

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function positiveIntegerOrUndefined(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function managedField(path: string[], value: unknown): ManagedField {
  return { path, value };
}

function pushClaudeModeField<T>(fields: ManagedField[], path: string[], mode: ClaudeSettingMode, enabledValue: T, disabledValue: T): void {
  if (mode === 'enabled') {
    fields.push(managedField(path, enabledValue));
  } else if (mode === 'disabled') {
    fields.push(managedField(path, disabledValue));
  }
}

function normalizeClaudeRuntimeSettings(value: unknown): ClaudeRuntimeSettings {
  const raw = objectValue(value);
  const autoCompactPctOverride = raw.autoCompactPctOverride === undefined || raw.autoCompactPctOverride === null || raw.autoCompactPctOverride === ''
    ? undefined
    : Number(raw.autoCompactPctOverride);
  if (autoCompactPctOverride !== undefined && (!Number.isInteger(autoCompactPctOverride) || autoCompactPctOverride < 1 || autoCompactPctOverride > 99)) {
    throw new Error('Claude 自动压缩比例覆盖必须是 1-99 的整数百分比。');
  }
  return {
    autoCompactPctOverride,
    attributionHeader: normalizeClaudeMode(raw.attributionHeader),
    disableNonessentialTraffic: normalizeClaudeMode(raw.disableNonessentialTraffic),
    experimentalAgentTeams: normalizeClaudeMode(raw.experimentalAgentTeams),
    enableToolSearch: normalizeClaudeMode(raw.enableToolSearch),
    sandbox: normalizeClaudeMode(raw.sandbox)
  };
}

function normalizeCodexRuntimeSettings(value: unknown): CodexRuntimeSettings {
  const raw = objectValue(value);
  return {
    serviceTier: optionalKnownString(raw.serviceTier, CODEX_SERVICE_TIERS, 'Codex service_tier'),
    sandboxMode: optionalKnownString(raw.sandboxMode, CODEX_SANDBOX_MODES, 'Codex sandbox_mode'),
    approvalPolicy: optionalKnownString(raw.approvalPolicy, CODEX_APPROVAL_POLICIES, 'Codex approval_policy')
  };
}

function optionalKnownString<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
  const text = stringValue(value);
  if (!text) {
    return undefined;
  }
  const matched = knownString(text, allowed);
  if (!matched) {
    throw new Error(`${label} 必须是 ${allowed.join('、')} 之一。`);
  }
  return matched;
}

function knownString<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const text = stringValue(value);
  return allowed.includes(text as T) ? text as T : undefined;
}

function emptyClaudeRuntimeSettings(): ClaudeRuntimeSettings {
  return {
    attributionHeader: 'unset',
    disableNonessentialTraffic: 'unset',
    experimentalAgentTeams: 'unset',
    enableToolSearch: 'unset',
    sandbox: 'unset'
  };
}

function normalizeClaudeMode(value: unknown): ClaudeSettingMode {
  return value === 'enabled' || value === 'disabled' ? value : 'unset';
}

function claudeModeFromValue<T>(value: unknown, enabledValue: T, disabledValue: T): ClaudeSettingMode {
  if (value === enabledValue) {
    return 'enabled';
  }
  if (value === disabledValue) {
    return 'disabled';
  }
  return 'unset';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT');
}
