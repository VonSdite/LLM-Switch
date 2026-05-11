# LLM-Switch

LLM-Switch 是一个 VS Code 插件，用于统一管理 AI Provider，并把 Provider 的 API 地址、API key 和模型配置应用到 Claude、Codex、opencode。

## 主要功能

- 管理共享 Provider：新增、编辑、删除、拖拽排序。
- 为 Provider 配置 Claude、Codex、opencode 三类 Agent API 地址。
- 维护 Provider 模型列表，支持手动填写和从接口拉取。
- 在 Agents 页面管理 Claude、Codex、opencode 的配置文件路径。
- 保存前展示配置变化预览，包括 token/API key 明文变化。
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
- `代理模式`：支持直连模式、系统代理模式、自定义代理；选择自定义代理时需要填写代理地址。
- `SSL 证书校验`：默认不勾选。
- `模型列表`：每行一个模型，保存时会去重并排序。

### 拉取模型

Provider 弹窗中的 `拉取模型` 会从当前填写的 API 地址推导基础地址，并只尝试：

- `/v1/models`
- `/models`

拉取规则：

- 如果 Provider 填了 API key，请求会携带 `Bearer <API key>`。
- 如果代理模式选择了自定义代理，会通过该代理请求。
- 拉取模型时始终不校验 SSL 证书。
- 拉取结果会弹出模型选择窗口，可搜索、勾选、取消勾选。
- 确认后写回当前模型清单；保存 Provider 时模型列表会去重、排序。

## Agents 管理

`Agents` 页面包含 `Claude`、`Codex`、`opencode` 三个子 tab。每个 Agent 页面都显示当前配置文件路径，并支持：

- 直接修改配置文件路径，失焦后自动生效。
- `重置` 为默认路径。
- `打开配置`，文件不存在时只提示错误，不自动创建。
- 选择可用 Provider 和模型。
- 在保存前查看配置变化预览。

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

模型环境变量支持选择 `不设置`。保存后会删除对应 env key，不写入空值。

Claude 保存只接管上述 base URL、token 和模型环境变量，不修改 `NODE_TLS_REJECT_UNAUTHORIZED` 或代理相关环境变量。

### Codex

Codex 页面会写入 `config.toml`：

- `model_provider`
- `model`
- `[model_providers.<provider>]`
- `[model_providers.<provider>].name`
- `[model_providers.<provider>].base_url`
- `[model_providers.<provider>].wire_api`

Codex 页面还会写入 `auth.json`：

- `OPENAI_API_KEY`

Codex 的 `model_provider` 和 `[model_providers.<provider>]` 使用 Provider 名称。

### opencode

opencode 页面会写入 `opencode.json`：

- `model`
- `provider.<provider>.npm`
- `provider.<provider>.name`
- `provider.<provider>.options.baseURL`
- `provider.<provider>.options.apiKey`
- `provider.<provider>.models`

opencode 的 `npm` 值来自 Provider 中配置的 `opencode npm`。

## 快速切换模型

插件提供三个快速切换模型命令：

- `LLM-Switch: Quick Switch Claude Model`
- `LLM-Switch: Quick Switch Codex Model`
- `LLM-Switch: Quick Switch opencode Model`

快速切换行为：

- 候选项来自支持对应 Agent 的 Provider 和模型列表。
- 候选项显示为 `Provider / model`。
- Quick Pick 会显示当前配置的模型。
- 当前匹配项会标记为 `当前`。
- Claude 如果多个模型环境变量不一致，会提示当前模型不一致，并显示各模型出现次数。
- 选择 Claude 模型后，会把 5 个 Claude 模型环境变量统一切换到所选模型。
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

- Provider 数据保存在 VS Code 插件全局状态中，key 为 `providers`。
- Agent 配置文件路径也保存在 VS Code 插件全局状态中。
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

在 VS Code 中按 `F5` 启动 Extension Development Host，然后执行 `LLM-Switch: Open Manager` 打开管理页面。

## Git 忽略

项目不会提交 `node_modules/`、`dist/`、`.vsix` 等依赖或构建产物。运行或打包前请在本地安装依赖并编译。
