# LLM-Switch

LLM-Switch 是一个 VS Code 插件，用于统一管理 AI Provider，并把 Provider 的 API 地址、API key 和模型配置应用到 Claude、Codex、opencode。

## 主要功能

- 管理共享 Provider：新增、编辑、删除、拖拽排序。
- 为 Provider 配置 Claude、Codex、opencode 三类 Agent API 地址。
- 维护 Provider 模型参数，包括上下文窗口、压缩阈值和最大输出。
- 根据模型 ID 提供内置参数候选，并支持从接口拉取模型 ID。
- 在 Agents 页面管理 Claude、Codex、opencode 的配置文件路径。
- 保存前展示配置变化预览和“写入 / 删除 / 保持不变”状态，包括 token/API key 明文变化。
- 保存 Agent 配置前自动备份旧配置文件，最多保留 5 份。
- 提供 VS Code 命令快速打开配置文件。
- 提供 VS Code 命令快速切换 Claude、Codex、opencode 模型。

## Provider 管理

`Providers` 页面以表格管理 Provider，支持：

- 新增 Provider。
- 编辑 Provider。
- 删除 Provider，删除前会二次确认。
- 拖拽表格最左侧把手调整 Provider 顺序。
- 表格模型列最多展示 4 个模型 ID，超出后用 `...` 表示。

Provider 字段：

- `Provider 名称`：必填，名称唯一；只允许英文字母、数字、下划线和中划线，长度 1-64，且必须以字母或数字开头。
- `API key`：可留空；弹窗内支持显示/隐藏明文。
- `Claude API 地址`：填写后，该 Provider 可用于 Claude。
- `Codex API 地址`：填写后，该 Provider 可用于 Codex。
- `Codex wire_api`：可选 `responses` 或 `chat`，保存 Codex 配置时写入 `[model_providers.<provider>]`。
- `opencode API 地址`：填写后，该 Provider 可用于 opencode。
- `opencode npm`：可选 `@ai-sdk/openai-compatible`、`@ai-sdk/openai`，也可选择自定义并填写 npm 包名。
- `拉取代理`：仅用于拉取模型，默认系统代理模式，支持直连模式、系统代理模式、自定义代理；选择自定义代理时需要填写代理地址。
- `校验证书`：仅用于拉取模型，默认不勾选。
- `模型 ID`：模型的原始 ID，保存时去重并排序。
- `上下文窗口`：正整数，可留空。
- `压缩阈值`：可留空；填写时使用 1-99 的整数百分比。
- `最大输出`：正整数，可留空；填写时小于或等于上下文窗口。

模型参数采用紧凑台账编辑。输入模型 ID 后，插件按“精确 ID、忽略大小写、Provider 前缀、`[1m]` 后缀、明确别名、日期快照”的顺序识别内置参数。候选值独立于已保存值，点击候选或“填充空项”后才会写入表单。

内置候选覆盖智谱 GLM、DeepSeek、通义千问、MiniMax 和 Codex/OpenAI 相关模型。未识别模型会显示以下通用候选：

- 上下文窗口：`128000`
- 压缩阈值：`80%` 候选
- 最大输出：`32000`

新增和拉取的模型只填入模型 ID，其余参数保持空白。用户点击候选或手动输入后，参数才会保存。当压缩阈值后的预留空间小于最大输出时，界面显示提示并允许保存。该提示用于说明客户端可能提前压缩。

### 拉取模型

Provider 弹窗中的 `拉取模型` 会从当前填写的 API 地址推导基础地址，并只尝试：

- `/v1/models`
- `/models`

拉取规则：

- 如果 Provider 填了 API key，请求会携带 `Bearer <API key>`。
- 直连模式会强制绕过 Node 全局代理，直接连接目标 API 地址。
- 系统代理模式会优先使用 VS Code 的 `http.proxy`/`http.proxyAuthorization`，没有配置时读取 `HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY`，并遵守 `NO_PROXY`。
- 自定义代理模式会通过填写的代理地址请求；连接代理服务器本身时也会绕过 Node 全局代理。
- 勾选 `校验证书` 后会校验拉取模型请求中的 SSL 证书；默认不校验。
- 拉取结果会弹出模型选择窗口，可搜索、勾选、取消勾选。
- 确认后按模型 ID 合并当前清单；已有模型保留参数，新模型的参数保持空白。

## Agents 管理

`Agents` 页面包含 `Claude`、`Codex`、`opencode` 三个子 tab。每个 Agent 页面都显示当前配置文件路径，并支持：

- 直接修改配置文件路径，失焦后自动生效。
- `重置` 为默认路径。
- `打开配置`，文件不存在时只提示错误，不自动创建。
- 选择可用 Provider 和模型。
- 在保存前查看配置变化预览。

插件在 `globalStorageUri/managedAgentConfig.json` 记录最后一次下发的字段和值。切换 Provider、模型或取消某项设置时，插件删除仍等于上次下发值的字段，并保留用户之后手动修改的字段。

Provider 只有配置了对应 Agent 的 API 地址后，才会出现在该 Agent 的 Provider 下拉框中。

默认路径：

| Agent | Linux / macOS | Windows |
| --- | --- | --- |
| Claude | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Codex config.toml | `~/.codex/config.toml` | `%USERPROFILE%\.codex\config.toml` |
| Codex auth.json | `~/.codex/auth.json` | `%USERPROFILE%\.codex\auth.json` |
| opencode | `~/.config/opencode/opencode.json` | `%USERPROFILE%\.config\opencode\opencode.json` |

### Claude

Claude 页面会写入 `settings.json` 的 `env`：

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_REASONING_MODEL`
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`（可选）
- `CLAUDE_CODE_ATTRIBUTION_HEADER`（可选）
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`（可选）
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`（可选）
- `ENABLE_TOOL_SEARCH`（可选）

每个 Provider 模型在 Claude 下拉框和快速切换中显示普通版和 `[1M]` 版。`[1M]` 选项实际写入 `model-id[1m]`，由用户按上游模型能力选择。

Claude 在主模型的上下文窗口和压缩阈值都已填写时，计算并写入顶层 `autoCompactWindow`：

```text
autoCompactWindow = floor(contextWindow × compactThresholdPercent / 100)
```

Claude Code 接受 `100000-1000000` 的 `autoCompactWindow`。换算结果超出范围时，插件显示错误并停止保存。Claude 的最大输出参数保存在 Provider 中，用于其他客户端；Claude 配置不接收该字段。

运行设置使用“未设置 / 启用 / 禁用”三态选择。Sandbox 写入原生 `sandbox.enabled`，其余运行设置写入对应 env。插件管理的字段遵循配置所有权规则。

### Codex

Codex 页面会写入 `config.toml`：

- `model_provider`
- `model`
- `[model_providers.<provider>]`
- `[model_providers.<provider>].name`
- `[model_providers.<provider>].base_url`
- `[model_providers.<provider>].wire_api`
- `[model_providers.<provider>].requires_openai_auth`
- `model_context_window`
- `model_auto_compact_token_limit`

Codex 页面还会写入 `auth.json`：

- `OPENAI_API_KEY`

Codex 的 `model_provider` 和 `[model_providers.<provider>]` 使用 Provider 名称。
Provider 配置了 API key 时，`requires_openai_auth` 写入 `true`；API key 为空时写入 `false`。

Codex 使用所选模型的上下文窗口。上下文窗口和压缩阈值都已填写时，插件计算 `model_auto_compact_token_limit`；未选择压缩阈值时，插件清理自己管理的自动压缩字段。

### opencode

opencode 页面会写入 `opencode.json`：

- `model`
- `provider.<provider>.npm`
- `provider.<provider>.name`
- `provider.<provider>.options.baseURL`
- `provider.<provider>.options.apiKey`
- `provider.<provider>.models`
- `provider.<provider>.models.<model>.limit.context`
- `provider.<provider>.models.<model>.limit.output`
- `compaction.reserved`

opencode 的 `npm` 值来自 Provider 中配置的 `opencode npm`。

opencode 使用以下换算：

```text
compaction.reserved = contextWindow - floor(contextWindow × compactThresholdPercent / 100)
```

opencode 的 `limit` 同时接收上下文窗口和最大输出。当前模型需要同时配置这两个值；Provider 中其他参数完整的模型也会写入模型表。压缩阈值已填写时，插件计算 `compaction.reserved`；未填写时不下发压缩配置。

## 快速切换模型

插件提供三个快速切换模型命令：

- `LLM-Switch: Quick Switch Claude Model`
- `LLM-Switch: Quick Switch Codex Model`
- `LLM-Switch: Quick Switch opencode Model`

快速切换行为：

- 候选项来自支持对应 Agent 的 Provider 和模型列表，并显示模型参数摘要。
- 候选项显示为 `Provider / model`。
- Quick Pick 会显示当前配置的模型。
- 当前匹配项会标记为 `当前`。
- Claude 如果多个模型环境变量不一致，会提示当前模型不一致，并显示各模型出现次数。
- 选择 Claude 模型后，会把 5 个 Claude 模型环境变量统一切换到所选模型。
- Claude 候选包含普通版和 `[1M]` 版。
- 选择 Codex 模型后，会修改 Codex `model_provider`、`model`、`model_providers` 和 `auth.json`。
- 选择 opencode 模型后，会修改 opencode `model` 和对应 Provider 配置。

## 配置备份

保存 Agent 配置时，如果写入内容和当前文件内容不同，插件会先备份旧文件。

备份规则：

- 备份文件保存在原配置文件同目录。
- 命名格式为 `<原文件名>.bak.<数字>`，例如 `settings.json.bak.1`。
- `.bak.1` 是最近一次保存前的内容。
- 旧备份依次移动到 `.bak.2`、`.bak.3`、`.bak.4`、`.bak.5`。
- 最多保留 5 个备份，超过后删除最旧备份。
- 内容没有变化时不会生成新备份。
- Codex 的 `config.toml` 和 `auth.json` 会分别备份。

## VS Code 命令

| 命令标题 | 命令 ID | 作用 |
| --- | --- | --- |
| `LLM-Switch: Open Manager` | `llm-switch.openManager` | 打开 LLM-Switch 管理页面。 |
| `LLM-Switch: Open Claude Config` | `llm-switch.openClaudeConfig` | 打开 Claude 配置文件。 |
| `LLM-Switch: Open Codex Config` | `llm-switch.openCodexConfig` | 分栏打开 Codex `config.toml` 和 `auth.json`。 |
| `LLM-Switch: Open opencode Config` | `llm-switch.openOpencodeConfig` | 打开 opencode 配置文件。 |
| `LLM-Switch: Quick Switch Claude Model` | `llm-switch.quickSwitchClaudeModel` | 快速选择 Provider 模型并应用到 Claude。 |
| `LLM-Switch: Quick Switch Codex Model` | `llm-switch.quickSwitchCodexModel` | 快速选择 Provider 模型并应用到 Codex。 |
| `LLM-Switch: Quick Switch opencode Model` | `llm-switch.quickSwitchOpencodeModel` | 快速选择 Provider 模型并应用到 opencode。 |

## 存储位置

- 插件声明为 workspace 扩展；Remote SSH 场景下运行在远程 Extension Host。
- Provider 数据保存在扩展运行环境的 `globalStorageUri/providers.json`，其中包含 API key。
- Agent 配置文件路径保存在扩展运行环境的 `globalStorageUri/agentConfigPaths.json`。
- 插件管理的 Agent 字段和值保存在扩展运行环境的 `globalStorageUri/managedAgentConfig.json`。
- Claude、Codex、opencode 的实际配置写入各自的配置文件。

## 开发

安装依赖：

```bash
npm install
```

编译：

```bash
npm run compile
```

运行编译和模型参数测试：

```bash
npm test
```

在 VS Code 中按 `F5` 启动 Extension Development Host，然后执行 `LLM-Switch: Open Manager` 打开管理页面。

## Git 忽略

项目不会提交 `node_modules/`、`dist/`、`.vsix` 等依赖或构建产物。运行或打包前请在本地安装依赖并编译。
