#!/usr/bin/env node
/**
 * CC-Run CLI 入口
 * Claude 启动器 - 支持切换不同的 API endpoint
 */

// 强制 UTF-8 输出编码（修复 Bun 编译二进制的中文乱码问题）
// 通过 monkey patch console.log/error 确保所有输出都是 UTF-8
function safeLog(message: string): void {
  const encoder = new TextEncoder();
  process.stdout.write(encoder.encode(message + '\n'));
}

function safeError(message: string): void {
  const encoder = new TextEncoder();
  process.stderr.write(encoder.encode(message + '\n'));
}

// 检测是否在 Bun 编译环境中
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
import { tokenSet, tokenClean } from './commands/token.js';
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
  .name('runcc')
  .description('Claude 启动器 - 支持切换不同的 API endpoint')
  .version('0.1.0');

// runcc list
program.command('list').description('列出所有可用的 endpoints').action(list);

// runcc add <name> <endpoint>
program
  .command('add')
  .description('添加自定义 endpoint')
  .argument('<name>', 'endpoint 名称')
  .argument('<endpoint>', 'API 地址')
  .action(add);

// runcc remove <name>
program
  .command('remove')
  .description('删除自定义 endpoint')
  .argument('<name>', 'endpoint 名称')
  .action(remove);

// runcc token 子命令
const tokenCmd = program.command('token').description('token 管理');

tokenCmd
  .command('set')
  .description('设置 token')
  .argument('<provider>', 'provider 名称 (glm, deepseek, minimax 或自定义)')
  .argument('[token]', 'API Token（可选，不传则交互输入）')
  .action(tokenSet);

tokenCmd
  .command('clean')
  .alias('clear')
  .description('清除 token')
  .argument('<provider>', 'provider 名称 (glm, deepseek, minimax 或自定义)')
  .action(tokenClean);

// runcc proxy 子命令
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
  .option('--claude', '持久化配置到 ~/.claude/settings.json，让 claude 命令使用指定 endpoint')
  .allowExcessArguments(true)  // 允许额外参数以支持 --
  .action(async (provider, options) => {
    try {
      validateDashPosition(process.argv);
      const passthroughArgs = extractPassthroughArgs(process.argv);

      if (!provider) {
        // runcc 或 cc-run --claude
        if (options.claude) {
          restoreOfficial(passthroughArgs);
        } else {
          await runOfficial(passthroughArgs);
        }
      } else {
        // runcc <provider> [--claude]
        await runProvider(provider, options.claude, passthroughArgs);
      }
    } catch (error) {
      if (error instanceof PassthroughArgsError) {
        console.error('❌ 参数位置不正确');
        console.error('');
        console.error('正确的用法示例:');
        console.error('  runcc -- <claude参数>          # 启动官方 Claude 并透传参数');
        console.error('  runcc glm -- <claude参数>      # 使用 glm provider 并透传参数');
        console.error('  runcc --claude -- <参数>        # 恢复官方配置并透传参数');
        console.error('  runcc glm --claude -- <参数>    # 配置原生 claude 命令使用 glm（持久化）');
        console.error('');
        console.error('说明: -- 分隔符用于将后续参数透传给 Claude CLI');
        console.error('      --claude 会将配置写入 ~/.claude/settings.json，之后直接运行 claude 即可使用指定 endpoint');
        process.exit(1);
      }
      throw error;
    }
  });

// 解析参数
// 特殊处理: 当 -- 是第一个参数时（runcc -- <args>），
// 我们需要防止 Commander.js 将 -- 后的参数解析为 [provider]
// 这种情况下只传递 node 和脚本路径给 Commander.js，
// 让 provider 为 undefined，从而进入官方模式
const userArgs = process.argv.slice(2);
if (userArgs[0] === '--') {
  // runcc -- <args> -> 只传递前两个元素给 Commander.js
  program.parse([process.argv[0], process.argv[1]]);
} else {
  // 正常情况
  program.parse();
}
