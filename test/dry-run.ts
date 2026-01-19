#!/usr/bin/env bun
/**
 * 干运行测试脚本
 * 验证 cc-run 的环境变量设置和配置操作
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CC_RUN_CONFIG = join(homedir(), '.cc-run', 'config.json');
const CLAUDE_SETTINGS = join(homedir(), '.claude', 'settings.json');

console.log('\n=== CC-Run 干运行测试 ===\n');

// 1. 显示配置文件
function showConfig(path: string, name: string) {
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf-8');
      const config = JSON.parse(content);
      console.log(`📄 ${name}:`);
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.log(`❌ 读取 ${name} 失败: ${error}`);
    }
  } else {
    console.log(`📄 ${name}: 不存在`);
  }
  console.log();
}

// 测试函数
async function testDryRun(provider: string, options: { claude?: boolean }) {
  console.log(`\n--- 测试: cc-run ${provider}${options.claude ? ' --claude' : ''} ---\n`);

  // 显示操作前配置
  console.log('【操作前配置】');
  showConfig(CC_RUN_CONFIG, '~/.cc-run/config.json');
  showConfig(CLAUDE_SETTINGS, '~/.claude/settings.json');

  // 模拟环境变量构建
  console.log('【将设置的环境变量】');

  if (!provider || provider === 'official') {
    // 官方模式
    console.log('ANTHROPIC_AUTH_TOKEN=<官方从账户读取>');
    console.log('http_proxy=<根据 proxy 配置>');
    console.log('https_proxy=<根据 proxy 配置>');
  } else {
    // Provider 模式
    const endpoints: Record<string, string> = {
      glm: 'https://open.bigmodel.cn/api/paas/v4/',
      deepseek: 'https://api.deepseek.com',
      minimax: 'https://api.minimax.chat/v1',
    };

    const endpoint = endpoints[provider];
    if (endpoint) {
      console.log(`ANTHROPIC_BASE_URL=${endpoint}`);
      console.log('ANTHROPIC_AUTH_TOKEN=<从 ~/.cc-run/config.json 读取或提示输入>');
      console.log('http_proxy=<根据 proxy 配置>');
      console.log('https_proxy=<根据 proxy 配置>');

      if (options.claude) {
        console.log('\n【将修改 ~/.claude/settings.json】');
        console.log(`apiUrl=${endpoint}`);
        console.log('anthropicApiKey=<对应 token>');
      }
    } else {
      console.log(`❌ 未找到 provider "${provider}"`);
    }
  }

  console.log();
}

// 主测试流程
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
用法:
  bun test/dry-run.ts                 # 显示帮助
  bun test/dry-run.ts list           # 测试 list 命令
  bun test/dry-run.ts glm            # 测试 run provider
  bun test/dry-run.ts glm --claude   # 测试 run provider --claude
  bun test/dry-run.ts official       # 测试 run official
  bun test/dry-run.ts --claude       # 测试 --claude 恢复
  bun test/dry-run.ts proxy status   # 测试 proxy status
  bun test/dry-run.ts config         # 显示当前配置
    `);
    return;
  }

  const [cmd, ...rest] = args;

  switch (cmd) {
    case 'config':
      console.log('【当前配置】');
      showConfig(CC_RUN_CONFIG, '~/.cc-run/config.json');
      showConfig(CLAUDE_SETTINGS, '~/.claude/settings.json');
      break;

    case 'glm':
    case 'deepseek':
    case 'minimax':
      await testDryRun(cmd, { claude: rest.includes('--claude') });
      break;

    case 'official':
      await testDryRun('', {});
      break;

    case '--claude':
      console.log('\n--- 测试: cc-run --claude ---\n');
      console.log('【操作前配置】');
      showConfig(CLAUDE_SETTINGS, '~/.claude/settings.json');
      console.log('【将执行操作】');
      console.log('删除 ~/.claude/settings.json 中的 apiUrl 和 anthropicApiKey\n');
      break;

    case 'list':
      console.log('\n--- 测试: cc-run list ---\n');
      console.log('【将显示】');
      console.log('内置 endpoints: glm, deepseek, minimax');
      console.log('自定义 endpoints: 从 ~/.cc-run/config.json 读取\n');
      break;

    case 'proxy':
      const proxyCmd = rest[0];
      if (proxyCmd === 'status') {
        console.log('\n--- 测试: cc-run proxy status ---\n');
        showConfig(CC_RUN_CONFIG, '~/.cc-run/config.json');
        showConfig(CLAUDE_SETTINGS, '~/.claude/settings.json');
      }
      break;

    default:
      console.log(`❌ 未知命令: ${cmd}`);
  }
}

main();
