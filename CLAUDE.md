# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**runcc** 是一个 TypeScript CLI 工具，用于在 Claude Code 中切换不同的 API 端点。它允许用户使用第三方 API 提供商（GLM、DeepSeek、Minimax）或自定义端点，同时保持与 Claude 原生配置的无缝集成。

## 开发命令

### 运行与构建
```bash
bun run dev              # 开发模式运行
bun run build           # 编译到 dist/
bun run build:bin       # 编译独立二进制文件
```

### 测试
```bash
bun test                # 运行所有测试
bun test --watch        # 监视模式
bun run test:unit       # 仅单元测试
bun run test:integration # 仅集成测试
```

### 发布
```bash
/publish                # 使用 publish skill 自动化发布流程
```

## 核心架构

### 双配置系统

1. **RunCC Config** (`~/.runcc/config.json`)
   - 存储自定义端点、API token、代理设置
   - 通过 `src/config/storage.ts` 管理
   - 结构示例：
   ```json
   {
     "endpoints": [...],
     "tokens": {"glm": "sk-...", "deepseek": "sk-..."},
     "lastUsed": "glm",
     "proxy": {"enabled": true, "url": "http://...", "clearForOfficial": false}
   }
   ```

2. **Claude Settings** (`~/.claude/settings.json`)
   - Claude 原生配置文件
   - 通过 `src/utils/claude-settings.ts` 管理
   - 包含 proxy、apiUrl、anthropicApiKey 和 env 配置
   - 结构示例：
   ```json
   {
     "proxy": "http://...",
     "apiUrl": "https://...",
     "anthropicApiKey": "sk-...",
     "env": {
       "ANTHROPIC_BASE_URL": "...",
       "ANTHROPIC_AUTH_TOKEN": "..."
     }
   }
   ```

**关键设计模式：临时修改模式** - 在官方模式下启动时，临时清除第三方配置并在 Claude 退出后恢复。

### 目录结构

```
src/
├── index.ts              # CLI 入口，使用 Commander.js
├── commands/             # CLI 命令实现
│   ├── run.ts           # 核心启动逻辑，支持官方/提供商/配置模式
│   ├── list.ts          # 列出可用端点
│   ├── add.ts           # 添加自定义端点
│   ├── remove.ts        # 删除自定义端点
│   └── proxy.ts         # 代理管理（on/off/reset/status/help）
├── config/
│   ├── types.ts         # TypeScript 接口定义
│   ├── endpoints.ts     # 内置端点定义和模型映射
│   └── storage.ts       # 配置文件 CRUD 操作
└── utils/
    ├── claude-settings.ts  # Claude 配置读写、备份/恢复
    ├── launcher.ts         # 进程启动和退出码处理
    ├── env.ts              # ANTHROPIC_* 环境变量构建
    ├── passthrough-args.ts # -- 分隔符后的参数解析
    └── output.ts           # UTF-8 安全输出（修复中文显示）
```

### 关键设计决策

1. **UTF-8 处理**：在编译后的二进制文件中 monkey-patch `console.log/error` 确保中文字符正确显示

2. **临时修改模式**：启动官方 Claude 时临时清除第三方配置，退出后恢复

3. **环境变量策略**：使用 `ANTHROPIC_*` 环境变量而非文件修改来使用第三方 API

4. **模型映射**：支持将 Claude 模型层级（haiku/opus/sonnet）映射到提供商特定模型

5. **代理灵活性**：支持每会话代理配置，可选在官方模式下清除（clearForOfficial）

6. **参数透传**：通过 `--` 分隔符支持透传参数给 Claude CLI

7. **交互式提示**：使用 Node.js readline 在未预配置时获取 token 和代理输入

## 测试策略

- **单元测试**：测试独立模块（storage、endpoints、env 等）
- **集成测试**：测试命令工作流（run、list、add、remove、proxy）
- **测试夹具**：`src/__tests__/fixtures/` 下的 mock 实现（mock-fs、mock-readline、mock-process）
- **环境隔离**：使用 `CC_RUN_TEST_HOME` 环境变量
- **手动测试**：`test/` 目录下的 dry-run、mock-claude、verify-passthrough

测试文件位于 `src/__tests__/`，使用 Bun Test 框架。

## 发布流程

项目包含自定义 **publish skill**，自动化 npm 发布：
1. 预检查（git 状态必须干净）
2. 版本 bump（`npm version`，创建 commit + tag）
3. 运行测试
4. 构建
5. 生成/更新 CHANGELOG
6. Git 提交
7. Git push（需用户确认）
8. 输出 `npm publish` 命令供手动执行

## 安装测试

```bash
./test-install.sh       # 完整的安装/测试/卸载循环
```

## 技术栈

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, ES2022 target)
- **CLI Framework**: Commander.js ^12.0.0
- **Testing**: Bun Test
- **Minimum Node**: >=18.0.0
- **License**: Apache-2.0

## 内置 Endpoints

| 名称 | Endpoint |
|------|----------|
| glm | https://open.bigmodel.cn/api/paas/v4/ |
| deepseek | https://api.deepseek.com |
| minimax | https://api.minimax.chat/v1 |

## Claude Code 技能

项目在 `.claude/skills/` 中包含 Claude Code 技能：
- **publish** - 自动化 npm 发布工作流（预检查 → 版本 bump → 测试 → 构建 → CHANGELOG → 提交 → 推送）

这体现了项目的 dogfooding 方法——使用 Claude Code 工具管理自己的开发工作流。

## 发布到 npm 的文件

- `dist/` - 编译后的 JavaScript
- `package.json` - 包元数据
- `README.md` - 用户文档
- `CHANGELOG.md` - 版本历史

**排除**：`src/`、`test/`、`*.test.ts`、`tsconfig.json`、`runcc` 二进制文件
