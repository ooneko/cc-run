# 手动测试工具目录

本目录用于存放手动测试脚本和验证工具。

## 脚本说明

| 脚本 | 功能 |
|------|------|
| `dry-run.ts` | 配置验证测试工具，不实际启动 Claude |
| `mock-claude.ts` | 模拟 Claude CLI 行为的测试脚本 |
| `verify-passthrough.ts` | 验证参数透传机制 |

## 运行方式

```bash
# 配置验证测试
bun test/dry-run.ts config

# GLM endpoint 测试
bun test/dry-run.ts glm

# DeepSeek endpoint 测试
bun test/dry-run.ts deepseek
```

## 与 `src/__tests__/` 的区别

| 特性 | `src/__tests__/` | `test/` |
|------|------------------|---------|
| 类型 | 自动化测试（Bun Test） | 手动测试脚本 |
| 触发方式 | `bun test` 命令 | 直接运行脚本 |
| 用途 | 持续集成、回归测试 | 开发调试、功能验证 |
| 断言 | 使用 `expect()` 等断言 | 观察输出结果 |
