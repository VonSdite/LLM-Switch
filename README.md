# LLM-Switch

LLM-Switch 是一个 VS Code 插件，用于统一管理 AI Provider，并把 Provider 的模型快速应用到 Claude、Codex 和 opencode 的配置文件中。

## 功能

- 管理 Provider：名称必填且不能重复，只允许英文字母、数字、下划线和中划线，长度 1-64，且必须以字母或数字开头；API key 可留空。
- 支持设置Provider代理模式，包括直连模式、系统代理模式、自定义代理模式。
- 支持配置 SSL 证书校验，默认不校验。
- 支持维护 Provider 的模型列表。
- 支持分别配置 Claude API 地址、Codex API 地址、opencode API 地址。
- Codex API 地址支持配置 `wire_api`，可选 `responses` 或 `chat`。
- 支持在编辑器中打开独立的 LLM-Switch 管理页面。
- 支持快速打开 Claude、Codex、opencode 的配置文件。

## VS Code 贡献内容

插件安装后会向 VS Code 增加命令，不会增加侧边栏视图，也不会注册 Activity Bar 图标。Agent 配置文件路径在插件管理页面中维护，不作为 VS Code Settings 配置项暴露。

### 新增命令

| 命令标题 | 命令 ID | 作用 |
| --- | --- | --- |
| `LLM-Switch: Open Manager` | `llm-switch.openManager` | 打开 LLM-Switch 管理页面。管理页面以编辑器 Webview 面板形式打开。 |
| `LLM-Switch: Open Claude Config` | `llm-switch.openClaudeConfig` | 打开 Claude 配置文件。文件不存在时提示错误，不自动创建。 |
| `LLM-Switch: Open Codex Config` | `llm-switch.openCodexConfig` | 同时打开 Codex `config.toml` 和 `auth.json`。文件不存在时提示错误，不自动创建。 |
| `LLM-Switch: Open opencode Config` | `llm-switch.openOpencodeConfig` | 打开 opencode 配置文件。文件不存在时提示错误，不自动创建。 |

### Agent 配置文件路径

Claude、Codex、opencode 的配置文件路径在 `Agents` 页面中直接管理。Codex 页面会同时管理 `config.toml` 和 `auth.json`。每个路径都支持：

- 查看当前使用的配置文件路径。
- 保存自定义配置文件路径。
- 恢复默认配置文件路径。
- 打开当前配置文件。

默认路径如下：

| Agent | Linux / macOS | Windows |
| --- | --- | --- |
| Claude | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Codex config.toml | `~/.codex/config.toml` | `%USERPROFILE%\.codex\config.toml` |
| Codex auth.json | `~/.codex/auth.json` | `%USERPROFILE%\.codex\auth.json` |
| opencode | `~/.config/opencode/opencode.json` | `%USERPROFILE%\.config\opencode\opencode.json` |

### 管理页面功能

`LLM-Switch: Open Manager` 会打开一个独立管理页面，页面包含以下 tab：

- `Providers`：以表格方式管理 Provider，支持新增、编辑、删除和拖拽排序。
- `Agents`：管理 Agent 配置，内部包含 `Claude`、`Codex`、`opencode` 三个子 tab。

Provider 页面行为：

- 点击 `新增 Provider` 会打开弹窗填写 Provider 内容。
- 点击表格中的 `编辑` 会打开弹窗修改 Provider 内容。
- 点击表格中的 `删除` 会提示确认，确认后删除 Provider。
- 表格最左侧的把手支持拖拽，拖拽后会保存 Provider 顺序。

Agents 页面行为：

- `Claude` 子 tab：管理 Claude 配置文件路径，选择可用于 Claude 的 Provider，并把模型和 API 配置写入 Claude 配置文件。
- `Codex` 子 tab：管理 Codex `config.toml` 和 `auth.json` 路径，选择可用于 Codex 的 Provider，并写入 Codex 的 `model_provider`、`model`、`model_providers` 和 `auth.json`。
- `opencode` 子 tab：管理 opencode 配置文件路径，选择可用于 opencode 的 Provider，并写入 opencode 的 `model` 和 `provider` 配置。

Provider 只有配置了对应 Agent 的 API 地址后，才会出现在该 Agent 页面的 Provider 下拉框中。例如，一个 Provider 只配置了 Codex API 地址，它只会出现在 Codex 页面，不会出现在 Claude 或 opencode 页面。

## Agent 配置

### Claude

Claude 页面会根据选择的 Provider 写入以下配置：

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_REASONING_MODEL`

Claude 模型环境变量可以选择“不设置”。保存后插件会删除对应 env key，不写入空值。

Claude 页面不会修改 `NODE_TLS_REJECT_UNAUTHORIZED` 或代理相关环境变量。

### Codex

Codex 页面会写入 `config.toml`：

- `model_provider`
- `model`
- `[model_providers.<provider>]`
- `base_url`
- `wire_api`

同时会写入 Codex 页面中配置的 `auth.json`：

- `OPENAI_API_KEY`

Codex 的 `model_provider` 和 `[model_providers.<provider>]` 会直接使用 Provider 名称。Provider 名称要求唯一，因此可作为 Codex Provider 标识。

### opencode

opencode 页面会写入：

- `model`
- `provider.<provider>`
- `provider.<provider>.options.baseURL`
- `provider.<provider>.models`

opencode 的模型格式为 `<provider>/<model>`。

## 开发

安装依赖：

```bash
npm install
```

编译：

```bash
npm run compile
```

在 VS Code 中按 `F5` 启动 Extension Development Host，然后执行命令 `LLM-Switch: Open Manager` 打开管理页面。

## Git 忽略

项目不会提交 `node_modules/`、`dist/`、`.vsix` 等依赖或构建产物。需要运行或打包时请在本地重新安装依赖并编译。
