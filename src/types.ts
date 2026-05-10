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

export interface ProviderConfig {
  id: string;
  key: string;
  name: string;
  apiKey: string;
  proxyMode: ProxyMode;
  customProxyUrl: string;
  sslCheck: boolean;
  models: string[];
  claudeBaseUrl: string;
  codexBaseUrl: string;
  codexWireApi: CodexWireApi;
  opencodeBaseUrl: string;
}

export interface ClaudeAgentState {
  path: string;
  exists: boolean;
  parseError?: string;
  selectedProviderId: string;
  baseUrl: string;
  hasAuthToken: boolean;
  models: Record<ClaudeModelKey, string>;
}

export interface CodexAgentState {
  path: string;
  exists: boolean;
  parseError?: string;
  selectedProviderId: string;
  modelProvider: string;
  providerBaseUrl: string;
  wireApi: string;
  model: string;
}

export interface OpencodeAgentState {
  path: string;
  exists: boolean;
  parseError?: string;
  selectedProviderId: string;
  providerKey: string;
  providerBaseUrl: string;
  model: string;
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
}

export interface SaveCodexPayload {
  providerId: string;
  model: string;
}

export interface SaveOpencodePayload {
  providerId: string;
  model: string;
}
