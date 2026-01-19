# CC 启动器实现计划

## 项目概述

使用 TypeScript + bun 创建 CC 启动器，支持切换不同的 API endpoint。

## 命令格式

| 命令 | 功能 |
|------|------|
| `cc-run` | **总是**启动官方 claude（根据配置决定是否临时清除 proxy 和第三方 endpoint） |
| `cc-run --claude` | 恢复原生 `claude` 命令使用官方 endpoint（删除 ~/.claude/settings.json 中的第三方配置） |
| `cc-run glm` | 使用 glm endpoint |
| `cc-run glm --claude` | 使用 glm，并配置原生 `claude` 命令默认使用 glm |
| `cc-run deepseek` | 使用 deepseek endpoint |
| `cc-run deepseek --claude` | 使用 deepseek，并配置原生 `claude` 命令默认使用 deepseek |
| `cc-run minimax` | 使用 minimax endpoint |
| `cc-run add <name> <endpoint> <token>` | 添加自定义 endpoint |
| `cc-run list` | 列出所有 endpoint |
| `cc-run remove <name>` | 删除自定义 endpoint |
| `cc-run proxy on` | 开启代理（修改 ~/.claude/settings.json） |
| `cc-run proxy off` | 关闭代理（修改 ~/.claude/settings.json） |
| `cc-run proxy reset` | 重置代理配置 |
| `cc-run proxy status` | 查看代理状态 |
| `cc-run proxy help` | 代理帮助信息 |

## 项目结构

```
cc-run/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI 入口
│   ├── commands/
│   │   ├── run.ts            # 启动命令
│   │   ├── add.ts            # 添加 endpoint
│   │   ├── list.ts           # 列出 endpoint
│   │   ├── remove.ts         # 删除 endpoint
│   │   └── proxy.ts          # 代理管理命令
│   ├── config/
│   │   ├── storage.ts        # 配置存储管理
│   │   ├── endpoints.ts      # 内置 endpoint 定义
│   │   └── types.ts          # 类型定义
│   └── utils/
│       ├── env.ts            # 环境变量设置
│       └── launcher.ts       # 启动 claude
└── README.md
```

## 内置 Endpoints

| 名称 | Endpoint |
|------|----------|
| glm | https://open.bigmodel.cn/api/paas/v4/ |
| deepseek | https://api.deepseek.com |
| minimax | https://api.minimax.chat/v1 |

## 配置存储

### ~/.cc-run/config.json（启动器配置）
`proxy.on/off` 会修改此文件的 proxy 配置，`cc-run <provider>` 会保存 token：
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

### ~/.claude/settings.json（Claude 官方配置）
`proxy on/off` 会修改此文件的 proxy 配置：
```json
{
  "proxy": "http://agent.baidu.com:8891"
}
```

## Proxy 处理逻辑

### cc-run proxy on
1. 提示输入代理地址（首次）
2. 保存到 `~/.cc-run/config.json`
3. 修改 `~/.claude/settings.json`，添加 proxy 配置

### cc-run proxy off
1. 更新 `~/.cc-run/config.json`（enabled: false）
2. 修改 `~/.claude/settings.json`，删除 proxy 配置

## 运行逻辑

### cc-run（无参数）

总是启动官方 claude。启动前会检查并清理 `~/.claude/settings.json`：

1. 读取当前的 `~/.claude/settings.json`
2. 检查是否有 `proxy` 配置
3. 检查是否有 `apiUrl` / `anthropicApiKey` 等第三方 endpoint 配置
4. 根据清理策略清理：
   - **proxy 清理**：由 `~/.cc-run/config.json` 中 `proxy.clearForOfficial` 决定
   - **endpoint 清理**：总是清除第三方 endpoint 配置
5. 启动 claude
6. claude 退出后恢复被清除的配置

**proxy 清理策略**（`~/.cc-run/config.json`）：
```json
{
  "proxy": {
    "clearForOfficial": true  // 启动官方 claude 时是否清除 proxy
  }
}
```

### cc-run <provider>

使用指定 endpoint，通过环境变量启动。

**Token 获取逻辑**：
1. 检查 `~/.cc-run/config.json` 中是否已保存该 provider 的 token
2. 如果没有，提示用户输入：
   ```
   请输入 glm 的 API Token: [输入框]
   ```
3. 保存 token 到 `~/.cc-run/config.json`：
   ```json
   {
     "tokens": {
       "glm": "sk-xxxxxxxx",
       "deepseek": "sk-yyyyyyyy",
       "minimax": "sk-zzzzzzzz"
     }
   }
   ```
4. 使用保存的 token 启动

### cc-run <provider> --claude
使用指定 endpoint，并**配置原生 `claude` 命令**的默认行为：
1. 使用指定 endpoint 启动 cc-run
2. 修改 `~/.claude/settings.json`，设置：
   - `apiUrl`: 指定 provider 的 endpoint
   - `anthropicApiKey`: 指定 provider 的 token
3. 之后直接运行原生 `claude` 命令时，会使用这个第三方 endpoint
4. **不影响** `cc-run` 无参数的行为（`cc-run` 仍然总是启动官方 claude）

### cc-run --claude（无 provider）
**恢复原生 `claude` 命令使用官方 endpoint**：
1. 删除 `~/.claude/settings.json` 中的 `apiUrl` 和 `anthropicApiKey`
2. 之后直接运行原生 `claude` 命令时，会使用官方 endpoint
3. 不启动 cc-run

> **注**：`--claude` 只影响原生 `claude` 命令，不影响 `cc-run`

## 环境变量

启动 CC 时设置：
- `ANTHROPIC_BASE_URL` - API endpoint
- `ANTHROPIC_AUTH_TOKEN` - API token
- `http_proxy` / `https_proxy` - 代理（如果配置）

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/index.ts` | CLI 入口，使用 commander 解析参数 |
| `src/config/storage.ts` | 配置文件读写、token 管理、endpoint 管理 |
| `src/utils/token.ts` | Token 获取和保存逻辑（首次使用时提示输入） |
| `src/commands/run.ts` | 核心启动逻辑，处理官方模式的 proxy 临时清除 |
| `src/commands/proxy.ts` | 代理管理命令（on/off/reset/status/help） |
| `src/utils/launcher.ts` | spawn claude 进程 |
| `src/utils/claude-settings.ts` | 读写 `~/.claude/settings.json` 的 proxy 和 endpoint 配置 |
| `src/config/types.ts` | TypeScript 类型定义 |

## 代理命令实现要点

| 命令 | 说明 |
|------|------|
| `cc-run proxy on` | 首次运行时提示输入代理地址，保存并修改 `~/.claude/settings.json` |
| `cc-run proxy off` | 关闭代理，删除 `~/.claude/settings.json` 中的 proxy 配置 |
| `cc-run proxy reset` | 重置代理配置 |
| `cc-run proxy status` | 显示代理状态（是否启用、地址） |
| `cc-run proxy help` | 显示代理相关帮助 |

## 依赖

```json
{
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "bun-types": "latest"
  }
}
```

## 验证方式

```bash
# 1. 构建
bun run build

# 2. 测试 list
bun run src/index.ts list

# 3. 测试 add
bun run src/index.ts add test https://api.test.com sk-test

# 4. 测试 proxy
bun run src/index.ts proxy status
bun run src/index.ts proxy on
bun run src/index.ts proxy off

# 5. 测试 run（需要已有 token）
bun run src/index.ts glm

# 6. 全局安装后测试
bun install -g
cc-run list
cc-run proxy status
```
