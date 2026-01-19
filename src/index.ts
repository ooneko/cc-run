#!/usr/bin/env bun
/**
 * CC-Run CLI 入口
 * Claude 启动器 - 支持切换不同的 API endpoint
 */

// 强制 UTF-8 输出编码（修复 Bun 编译二进制的中文乱码问题）
// 通过 monkey patch console.log/error 确保所有输出都是 UTF-8
function safeLog(message: string): void {
  const encoder = new TextEncoder();
  Bun.write(Bun.stdout, encoder.encode(message + '\n'));
}

function safeError(message: string): void {
  const encoder = new TextEncoder();
  Bun.write(Bun.stderr, encoder.encode(message + '\n'));
}

// 检测是否在 Bun 编译环境中（通过检查是否有 --compile 标记）
const isBunCompiled = typeof Bun !== 'undefined' && !import.meta.dir;

if (isBunCompiled) {
  console.log = (...args: unknown[]) => {
    safeLog(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) => {
    safeError(args.map(String).join(' '));
  };
}

import { Command } from 'commander';
import { list } from './commands/list.js';
import { add } from './commands/add.js';
import { remove } from './commands/remove.js';
import {
  proxyOn,
  proxyOff,
  proxyReset,
  proxyStatus,
  proxyHelp,
} from './commands/proxy.js';
import {
  runOfficial,
  runProvider,
  restoreOfficial,
} from './commands/run.js';
import {
  extractPassthroughArgs,
  validateDashPosition,
  PassthroughArgsError,
} from './utils/passthrough-args.js';

const program = new Command();

program
  .name('cc-run')
  .description('Claude 启动器 - 支持切换不同的 API endpoint')
  .version('0.1.0');

// cc-run list
program.command('list').description('列出所有可用的 endpoints').action(list);

// cc-run add <name> <endpoint>
program
  .command('add')
  .description('添加自定义 endpoint')
  .argument('<name>', 'endpoint 名称')
  .argument('<endpoint>', 'API 地址')
  .action(add);

// cc-run remove <name>
program
  .command('remove')
  .description('删除自定义 endpoint')
  .argument('<name>', 'endpoint 名称')
  .action(remove);

// cc-run proxy 子命令
const proxyCmd = program.command('proxy').description('代理管理');

proxyCmd.command('on').description('开启代理').action(proxyOn);
proxyCmd.command('off').description('关闭代理').action(proxyOff);
proxyCmd.command('reset').description('重置代理配置').action(proxyReset);
proxyCmd
  .command('status')
  .description('查看代理状态')
  .action(proxyStatus);
proxyCmd.command('help').description('代理帮助信息').action(proxyHelp);

// 主命令: cc-run [provider] [--claude] [-- ...args]
// - 无参数: 启动官方 Claude
// - <provider>: 使用指定 provider
// - --claude (无 provider): 恢复原生 claude 命令使用官方 endpoint
// - <provider> --claude: 配置原生 claude 命令默认使用此 provider
// - -- 之后的参数透传给 Claude CLI
program
  .argument('[provider]', 'provider 名称 (glm, deepseek, minimax 或自定义)')
  .option('--claude', '配置原生 claude 命令')
  .allowExcessArguments(true)  // 允许额外参数以支持 --
  .action(async (provider, options) => {
    try {
      validateDashPosition(process.argv);
      const passthroughArgs = extractPassthroughArgs(process.argv);

      if (!provider) {
        // cc-run 或 cc-run --claude
        if (options.claude) {
          restoreOfficial(passthroughArgs);
        } else {
          await runOfficial(passthroughArgs);
        }
      } else {
        // cc-run <provider> [--claude]
        await runProvider(provider, options.claude, passthroughArgs);
      }
    } catch (error) {
      if (error instanceof PassthroughArgsError) {
        console.error('❌ 参数位置不正确');
        console.error('');
        console.error('正确的用法示例:');
        console.error('  cc-run glm -- <claude参数>     # 使用 glm provider 并透传参数');
        console.error('  cc-run --claude -- <参数>       # 恢复官方配置并透传参数');
        console.error('  cc-run glm --claude -- <参数>   # 配置原生 claude 命令使用 glm');
        console.error('');
        console.error('说明: -- 分隔符用于将后续参数透传给 Claude CLI');
        process.exit(1);
      }
      throw error;
    }
  });

// 解析参数
program.parse();
