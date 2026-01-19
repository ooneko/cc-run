/**
 * Proxy 命令
 * 代理管理: on, off, reset, status, help
 */

import { createInterface } from 'node:readline';
import { getProxyConfig, setProxyConfig } from '../config/storage.js';
import {
  getClaudeProxy,
  setClaudeProxy,
  removeClaudeProxy,
  getClaudeSettingsFilePath,
} from '../utils/claude-settings.js';

/**
 * 开启代理
 */
export async function proxyOn(): Promise<void> {
  const currentConfig = getProxyConfig();
  let proxyUrl = currentConfig.url;

  // 如果没有保存过代理地址，提示输入
  if (!proxyUrl) {
    proxyUrl = await promptProxyUrl();
  }

  // 更新 cc-run 配置
  setProxyConfig(true, proxyUrl, currentConfig.clearForOfficial);

  // 更新 Claude 配置
  setClaudeProxy(proxyUrl);

  console.log(`代理已开启: ${proxyUrl}`);
  console.log(`配置文件: ${getClaudeSettingsFilePath()}`);
}

/**
 * 关闭代理
 */
export function proxyOff(): void {
  const currentConfig = getProxyConfig();

  // 更新 cc-run 配置
  setProxyConfig(false, currentConfig.url, currentConfig.clearForOfficial);

  // 删除 Claude 配置中的 proxy
  removeClaudeProxy();

  console.log('代理已关闭');
}

/**
 * 重置代理配置
 */
export function proxyReset(): void {
  setProxyConfig(false);
  removeClaudeProxy();
  console.log('代理配置已重置');
}

/**
 * 显示代理状态
 */
export function proxyStatus(): void {
  const ccRunConfig = getProxyConfig();
  const claudeProxy = getClaudeProxy();

  console.log('CC-Run 代理配置:');
  console.log(`  状态: ${ccRunConfig.enabled ? '开启' : '关闭'}`);
  if (ccRunConfig.url) {
    console.log(`  地址: ${ccRunConfig.url}`);
  }
  if (ccRunConfig.clearForOfficial !== undefined) {
    console.log(`  启动官方时清除: ${ccRunConfig.clearForOfficial ? '是' : '否'}`);
  }

  console.log('\nClaude 配置文件 (~/.claude/settings.json):');
  if (claudeProxy) {
    console.log(`  代理: ${claudeProxy}`);
  } else {
    console.log('  代理: 未配置');
  }
}

/**
 * 显示代理帮助信息
 */
export function proxyHelp(): void {
  console.log(`
代理管理命令:

  cc-run proxy on      开启代理（首次会提示输入代理地址）
  cc-run proxy off     关闭代理
  cc-run proxy reset   重置代理配置
  cc-run proxy status  查看代理状态
  cc-run proxy help    显示此帮助信息

说明:
  - proxy on 会修改 ~/.claude/settings.json，添加 proxy 配置
  - proxy off 会删除 ~/.claude/settings.json 中的 proxy 配置
  - 代理地址保存在 ~/.cc-run/config.json 中
`);
}

/**
 * 提示用户输入代理地址
 */
async function promptProxyUrl(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question('请输入代理地址 (例如 http://agent.baidu.com:8891): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
