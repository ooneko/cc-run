# runcc

Claude CLI 启动器，支持切换不同的 API endpoint。

## 功能特性

- 🔄 快速切换官方/第三方 API endpoint
- 🔐 保存和管理多个 API Token
- 🌐 代理配置管理
- ⚙️ 配置原生 `claude` 命令使用第三方 endpoint
- 📝 自定义 endpoint 支持

## 安装

```bash
npm install runcc@latest -g
```

## 快速开始

```bash
# 查看所有可用的 endpoints
runcc list

# 使用第三方 endpoint
runcc glm

# 配置原生 claude 命令使用 glm
runcc glm --claude

# 恢复原生 claude 使用官方 endpoint
runcc --claude

# 启动官方 claude
runcc
```

## 命令说明

### Endpoint 管理

| 命令 | 说明 |
|------|------|
| `runcc` | 启动官方 claude |
| `runcc glm` | 使用 glm endpoint |
| `runcc deepseek` | 使用 deepseek endpoint |
| `runcc minimax` | 使用 minimax endpoint |
| `runcc list` | 列出所有 endpoints |
| `runcc add <name> <endpoint> [token]` | 添加自定义 endpoint |
| `runcc remove <name>` | 删除自定义 endpoint |
| `runcc token set <provider> [token]` | 设置指定 provider 的 token |
| `runcc token clean <provider>` | 清除指定 provider 的 token（`clean`/`clear` 均可） |

### 原生命令配置（持久化）

| 命令 | 说明 |
|------|------|
| `runcc <provider> --claude` | 配置原生 `claude` 命令使用第三方 endpoint，持久化到 `~/.claude/settings.json` |
| `runcc --claude` | 恢复原生 `claude` 命令使用官方 endpoint |

### 代理管理

| 命令 | 说明 |
|------|------|
| `runcc proxy on` | 开启代理 |
| `runcc proxy off` | 关闭代理 |
| `runcc proxy status` | 查看代理状态 |
| `runcc proxy reset` | 重置代理配置 |

## 内置 Endpoints

| 名称 | Endpoint |
|------|----------|
| glm | https://open.bigmodel.cn/api/paas/v4/ |
| deepseek | https://api.deepseek.com |
| minimax | https://api.minimax.chat/v1 |

## 配置文件

### ~/.runcc/config.json

```json
{
  "endpoints": [
    {
      "name": "my-custom",
      "endpoint": "https://api.example.com/v1",
      "token": "sk-xxxxxxxx"
    }
  ],
  "tokens": {
    "glm": "sk-xxxxxxxx",
    "deepseek": "sk-yyyyyyyy",
    "minimax": "sk-zzzzzzzz"
  },
  "lastUsed": "glm",
  "proxy": {
    "enabled": true,
    "url": "http://agent.baidu.com:8891",
    "clearForOfficial": false
  }
}
```

### ~/.claude/settings.json

**使用官方 endpoint 时：**
```json
{
  "proxy": "http://agent.baidu.com:8891"
}
```

**运行 `runcc glm --claude` 后（使用第三方 endpoint）：**
```json
{
  "apiUrl": "https://open.bigmodel.cn/api/paas/v4/",
  "anthropicApiKey": "sk-glm-token",
  "proxy": "http://agent.baidu.com:8891"
}
```

## 使用示例

### 添加自定义 endpoint

```bash
runcc add my-api https://api.my-service.com/v1 sk-my-token
```

### 切换 endpoint

```bash
# 使用 glm
runcc glm

# 使用 deepseek
runcc deepseek

# 使用自定义 endpoint
runcc my-api
```

### 配置代理

```bash
# 开启代理（首次会提示输入代理地址）
runcc proxy on

# 查看代理状态
runcc proxy status

# 关闭代理
runcc proxy off
```

### 配置原生命令（持久化）

`--claude` 参数会将 endpoint 配置持久化写入 `~/.claude/settings.json`，之后直接运行 `claude` 命令时会使用指定的 endpoint。

```bash
# 让原生 claude 命令使用 glm
# 这会将 glm 配置写入 ~/.claude/settings.json
runcc glm --claude

# 之后直接使用 claude 命令即可，无需通过 runcc
claude "你好"

# 恢复使用官方 endpoint
runcc --claude
```

**注意**：`--claude` 配置是持久的，关闭 Claude 后仍然生效。如需切换回官方 endpoint，需运行 `runcc --claude`。

## Token 管理

首次使用某个 endpoint 时，如果未配置 token，会提示输入：

```bash
$ runcc glm
请输入 glm 的 API Token: [输入框]
```

Token 会被保存到 `~/.runcc/config.json`，下次使用时无需再次输入。

也可以通过命令行直接设置或清除：

```bash
# 设置/覆盖 token（不传 token 会交互输入）
runcc token set glm sk-xxxx

# 清除 token
runcc token clean glm
```

## 开发

```bash
# 安装依赖
bun install

# 运行开发模式
bun run dev

# 构建
bun run build
```

## License

MIT
