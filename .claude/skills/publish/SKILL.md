---
name: publish
description: 自动化 npm 包发布准备工作流。预检查 → 询问版本 → npm version → 测试 → 构建 → CHANGELOG → 提交 → 推送 → 打印发布命令（用户手动执行 npm publish）。触发词：发布新版本/publish to npm/bump version/release。
---

# NPM 发布工作流

预检查 → 提交未保存更改 → 询问版本 → npm version → 测试 → 构建 → CHANGELOG → 提交 → 推送 → 打印发布命令

## 工作流程

### 0. 预检查（重要！）

在开始任何操作前，**必须先检查 git 状态**：

```bash
# 检查当前分支
git branch --show-current

# 检查工作区状态
git status --short
```

**如果工作区干净**：直接进入步骤 1。

**如果有未提交更改**：使用 `AskUserQuestion` 询问用户：
- 先提交更改（使用 `/commit-commands:commit` 或手动提交）
- 丢弃更改（`git restore .`）
- 中止流程

**关键原因**：`npm version` 命令要求工作目录必须是干净状态，否则会报错退出。

### 1. 询问目标版本

使用 `AskUserQuestion` 询问用户要升级到什么版本：

| 类型 | 说明 | 示例 |
|------|------|------|
| patch | 错误修复、小改动 | 1.0.0 → 1.0.1 |
| minor | 新功能、向后兼容 | 1.0.0 → 1.1.0 |
| major | 破坏性更改 | 1.0.0 → 2.0.0 |
| custom | 指定确切版本号 | 1.0.0 → 1.2.3 |

### 2. 修改 npm 版本

```bash
npm version <patch|minor|major|x.y.z>
```

此命令会：
- 更新 package.json 和 package-lock.json 版本号
- 创建 git 提交（消息格式：`v<x.y.z>`）
- 创建 git 标签（`v<x.y.z>`）

### 3. 运行测试

```bash
bun run test
```

- 如果 package.json 有 test 脚本，执行测试
- 测试失败则中止流程，提示用户修复
- 无 test 脚本则跳过

### 4. 打包编译

```bash
bun run build
```

- 如果 package.json 有 build 脚本，执行构建
- 构建失败则中止流程，提示用户修复
- 无 build 脚本则跳过

### 5. 创建 CHANGELOG

#### 存在 CHANGELOG.md 时

```bash
# 查看自上次发布的提交
git log $(git tag -l | tail -n 1)..HEAD --oneline
```

**生成条目**：
- 格式：`## [<版本号>] - YYYY-MM-DD`
- 按类型分组：新功能、错误修复、破坏性更改

**审核流程**：
1. 显示生成的变更日志
2. 使用 `AskUserQuestion` 确认或修改
3. 更新 CHANGELOG.md

#### 不存在 CHANGELOG.md 时

询问用户是否创建。

### 6. 提交 git

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for <版本号>"
```

### 7. 询问是否 git push

使用 `AskUserQuestion` 询问是否推送：

```
是否推送到远程仓库？
```

用户确认后执行：
```bash
git push && git push --tags
```

### 8. 打印 npm publish 命令

显示发布命令，要求用户复制手动执行：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 准备发布: <package-name>@<new-version>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请复制以下命令并执行：

npm publish

（如需公共作用域包，使用: npm publish --access public）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 发布摘要

```
✅ 准备工作完成

- 包名: <package-name>
- 新版本: <new-version>
- Git 标签: v<new-version>
- CHANGELOG: 已更新

请执行上方 npm publish 命令完成发布。
```

## 最佳实践

- 发布前运行测试
- 保持 CHANGELOG.md 最新
- 遵循语义化版本规范
- 确认前审查更改
- 始终先提交再发布
- 为发布打标签
- 清楚标注破坏性更改
