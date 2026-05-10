# LLM-Switch

LLM-Switch 是一个 VS Code 插件，用于统一管理 AI Provider，并把 Provider 的模型快速应用到 Claude、Codex 和 opencode 的配置文件中。

## 功能

- 管理 Provider：名称必填，API key 可留空。
- 支持直连模式、系统代理模式、自定义代理模式。
- 支持配置 SSL 证书校验，默认不校验。
- 支持维护 Provider 的模型列表。
- 支持分别配置 Claude API 地址、Codex API 地址、opencode API 地址。
- Codex API 地址支持配置 `wire_api`，可选 `responses` 或 `chat`。
- 支持在编辑器中打开独立的 LLM-Switch 管理页面。
- 支持快速打开 Claude、Codex、opencode 的配置文件。

## Agent 配置

### Claude

Claude 页面会根据选择的 Provider 写入以下配置：

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN`
- `NODE_TLS_REJECT_UNAUTHORIZED`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_REASONING_MODEL`

如果当前 Claude 配置里的模型或 API 地址和已记录的 Provider 不匹配，页面会保留当前值并提示差异。

### Codex

Codex 页面会写入：

- `model_provider`
- `model`
- `[model_providers.<provider>]`
- `base_url`
- `wire_api`

Provider 的 key 会作为 Codex 的 `model_provider` 名称。

### opencode

opencode 页面会写入：

- `model`
- `provider.<provider>`
- `provider.<provider>.options.baseURL`
- `provider.<provider>.models`

opencode 的模型格式为 `<provider>/<model>`。

## 命令

- `LLM-Switch: Open Manager`
- `LLM-Switch: Open Claude Config`
- `LLM-Switch: Open Codex Config`
- `LLM-Switch: Open opencode Config`

## VS Code 配置项

- `llmSwitch.claude.configPath`
- `llmSwitch.codex.configPath`
- `llmSwitch.opencode.configPath`

配置项留空时使用默认路径：

- Claude：`~/.claude/settings.json`
- Codex：`~/.codex/config.toml`
- opencode：`~/.config/opencode/opencode.json`

Windows 下会解析到 `%USERPROFILE%` 对应目录。

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
