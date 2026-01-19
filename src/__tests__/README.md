# 自动化测试目录

本目录用于存放 Bun Test 自动化测试文件。

## 目录结构

```
src/__tests__/
├── unit/              # 单元测试（测试独立模块/函数）
├── integration/       # 集成测试（测试模块间协作）
├── fixtures/          # 测试数据、模拟文件
├── helpers/           # 测试辅助工具
└── *.test.ts          # 顶层测试文件
```

## 运行方式

```bash
# 运行所有测试
bun test

# 运行特定目录的测试
bun test src/__tests__/unit

# 运行单个测试文件
bun test src/__tests__/passthrough-args.test.ts

# 监听模式（文件变更时自动重新运行）
bun test --watch
```

## 文件命名约定

- 测试文件必须以 `.test.ts` 结尾
- 测试文件可放在对应子目录或顶层

## Fixtures 目录

存放测试所需的静态数据、模拟配置文件等。

## Helpers 目录

存放测试辅助函数、测试工具类等可复用代码。
