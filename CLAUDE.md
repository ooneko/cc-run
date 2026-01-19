# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**cc-run** 是一个 Claude CLI 启动器，使用 TypeScript + Bun 开发。核心功能是在官方 API 和多个第三方 API endpoints 之间快速切换。这是一个单文件可执行 CLI 工具，可作为全局命令安装。

## 开发命令

```bash
# 安装依赖
bun install

# 开发模式（直接运行 TypeScript 源码）
bun run dev

# 构建输出到 dist/index.js
bun run build

# 构建独立二进制可执行文件
bun run build:bin

# 全局安装（本地测试）
bun install -g .

# 配置验证测试工具
bun test/dry-run.ts config
bun test/dry-run.ts glm
```

**注意**: 项目无自动化测试框架、无 linting 配置、无 pre-commit hooks。

## 核心架构

项目采用三层架构设计：

```
┌─────────────────────────────────────────┐
│          CLI Layer (commands)           │
│  - 参数解析、用户交互、命令编排            │
├─────────────────────────────────────────┤
│        Business Logic (utils)           │
│  - 启动器、环境变量、Claude 配置管理       │
├─────────────────────────────────────────┤
│         Data Layer (config)             │
│  - 配置存储、类型定义、endpoints 管理     │
└─────────────────────────────────────────┘
```

### 目录结构

```
src/
├── index.ts              # CLI 入口，Commander 配置，命令路由
├── commands/             # 命令实现层
│   ├── run.ts           # 核心启动逻辑（官方/provider/配置模式）
│   ├── proxy.ts         # 代理管理命令
│   ├── list.ts          # 列出 endpoints（UTF-8 处理）
│   ├── add.ts           # 添加自定义 endpoint
│   └── remove.ts        # 删除 endpoint
├── config/              # 配置数据层
│   ├── types.ts         # TypeScript 类型定义
│   ├── endpoints.ts     # 内置 endpoints (glm/deepseek/minimax)
│   └── storage.ts       # ~/.cc-run/config.json 读写
└── utils/               # 工具层
    ├── launcher.ts      # spawn Claude 进程
    ├── env.ts           # 环境变量构建
    └── claude-settings.ts # ~/.claude/settings.json 读写
```

## 双配置文件系统

### ~/.cc-run/config.json (启动器私有配置)

存储自定义 endpoints、API tokens、最后使用的 endpoint、代理配置。

### ~/.claude/settings.json (Claude 官方配置)

存储 `proxy`、`apiUrl`、`anthropicApiKey`，由 Claude CLI 原生读取。

**关键机制**: 使用 `--claude` 标志可以将第三方 endpoint 配置写入 `~/.claude/settings.json`，使原生 `claude` 命令默认使用该 endpoint。

## 三种启动模式

### 1. 官方模式 (`cc-run`)
1. 备份当前 Claude 配置
2. 清除第三方 endpoint 配置
3. 根据 `clearForOfficial` 决定是否清除 proxy
4. 启动 Claude（不设置第三方环境变量）
5. 退出后恢复配置

### 2. Provider 模式 (`cc-run glm`)
1. 从内置或自定义 endpoints 查找配置
2. 获取 token（首次提示输入并保存）
3. 通过环境变量启动 Claude:
   - `ANTHROPIC_BASE_URL`
   - `ANTHROPIC_AUTH_TOKEN`
   - `http_proxy`/`https_proxy`

### 3. 配置模式 (`cc-run glm --claude`)
1. 执行 provider 模式启动
2. 额外写入 `~/.claude/settings.json`
3. 使原生 `claude` 命令默认使用此 endpoint

## 内置 Endpoints

| 名称 | Endpoint URL |
|------|--------------|
| glm | https://open.bigmodel.cn/api/paas/v4/ |
| deepseek | https://api.deepseek.com |
| minimax | https://api.minimax.chat/v1 |

**扩展点**: 添加内置 endpoint 需修改 `src/config/endpoints.ts`

## 代码风格约定

- **模块系统**: ES Modules（import 必须显式包含 `.js` 扩展名）
- **类型系统**: 严格模式 TypeScript
- **注释风格**: JSDoc 风格（中文）
- **错误处理**: 使用 `process.exit(1)` 终止，无异常抛出
- **文件组织**: 按功能分层，单一职责原则
- **命名约定**:
  - 文件名: kebab-case (`claude-settings.ts`)
  - 函数: camelCase
  - 类型: PascalCase
  - 常量: UPPER_SNAKE_CASE

## 关键技术实现

### 环境变量隔离
使用 `spawn` 的 `env` 选项实现环境变量隔离，避免污染全局环境。

### 配置原子操作
- 官方模式使用备份-修改-恢复模式确保配置安全
- 文件操作使用同步 API (`readFileSync`, `writeFileSync`)
- 目录不存在时自动创建 (`mkdirSync` with `recursive: true`)

### UTF-8 输出处理
`list.ts` 使用 `TextEncoder` 确保中文正确显示（标准 console.log 在某些环境下可能乱码）

### 交互式输入
使用 Node.js 原生 `readline` 模块实现 token 和代理地址输入

## 依赖外部条件

1. **Claude CLI**: 系统必须已安装 `claude` 命令
2. **配置目录**: 自动创建 `~/.cc-run/` 和 `~/.claude/`
3. **Node 版本**: >= 18.0.0
