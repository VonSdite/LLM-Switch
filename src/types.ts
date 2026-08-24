export type AgentName = 'claude' | 'codex' | 'opencode';
export type ProxyMode = 'direct' | 'system' | 'custom';
export type CodexWireApi = 'responses' | 'chat';

export const CLAUDE_MODEL_KEYS = [
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_REASONING_MODEL'
] as const;

export type ClaudeModelKey = typeof CLAUDE_MODEL_KEYS[number];

export interface ProviderModelConfig {
  id: string;
  contextWindow?: number;
  compactThresholdPercent?: number;
  maxOutputTokens?: number;
}

export type ClaudeSettingMode = 'unset' | 'enabled' | 'disabled';

export interface ClaudeRuntimeSettings {
  autoCompactPctOverride?: number;
  attributionHeader: ClaudeSettingMode;
  disableNonessentialTraffic: ClaudeSettingMode;
  experimentalAgentTeams: ClaudeSettingMode;
  enableToolSearch: ClaudeSettingMode;
  sandbox: ClaudeSettingMode;
}

export interface ProviderConfig {
  id: string;
  key: string;
  name: string;
  apiKey: string;
  proxyMode: ProxyMode;
  customProxyUrl: string;
  sslCheck: boolean;
  models: ProviderModelConfig[];
  claudeBaseUrl: string;
  codexBaseUrl: string;
  codexWireApi: CodexWireApi;
  opencodeBaseUrl: string;
  opencodeNpm: string;
}

export interface AgentConfigFileState {
  path: string;
  defaultPath: string;
  customPath: string;
  usesDefaultPath: boolean;
  exists: boolean;
  parseError?: string;
  managedPaths?: string[];
}

export interface ClaudeAgentState extends AgentConfigFileState {
  selectedProviderId: string;
  baseUrl: string;
  authToken: string;
  hasAuthToken: boolean;
  models: Record<ClaudeModelKey, string>;
  autoCompactWindow: number | null;
  runtimeSettings: ClaudeRuntimeSettings;
}

export interface CodexAgentState extends AgentConfigFileState {
  selectedProviderId: string;
  modelProvider: string;
  providerName: string;
  providerBaseUrl: string;
  wireApi: string;
  requiresOpenAiAuth: boolean | null;
  auth: AgentConfigFileState;
  openAiApiKey: string;
  hasOpenAiApiKey: boolean;
  model: string;
  modelContextWindow: number | null;
  modelAutoCompactTokenLimit: number | null;
}

export interface OpencodeAgentState extends AgentConfigFileState {
  selectedProviderId: string;
  providerKey: string;
  providerName: string;
  providerNpm: string;
  providerBaseUrl: string;
  providerApiKey: string;
  hasProviderApiKey: boolean;
  providerModelCount: number;
  model: string;
  modelContextWindow: number | null;
  maxOutputTokens: number | null;
  compactionReserved: number | null;
}

export interface AgentsState {
  claude: ClaudeAgentState;
  codex: CodexAgentState;
  opencode: OpencodeAgentState;
}

export interface WebviewState {
  providers: ProviderConfig[];
  agents: AgentsState;
}

export interface SaveClaudePayload {
  providerId: string;
  models: Record<ClaudeModelKey, string>;
  runtimeSettings: ClaudeRuntimeSettings;
}

export interface SaveCodexPayload {
  providerId: string;
  model: string;
}

export interface SaveOpencodePayload {
  providerId: string;
  model: string;
}
