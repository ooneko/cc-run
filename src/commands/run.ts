/**
 * Run 命令
 * 核心启动逻辑: 处理官方模式和第三方 provider 模式
 */

import { createInterface } from 'node:readline';
import type { Endpoint } from '../config/types.js';
import {
  getBuiltinEndpoint,
  isBuiltinEndpoint,
} from '../config/endpoints.js';
import {
  getCustomEndpoints,
  getToken,
  saveToken,
  setLastUsed,
  getProxyConfig,
} from '../config/storage.js';
import {
  removeThirdPartyApi,
  getClaudeProxy,
  removeClaudeProxy as deleteClaudeProxy,
  setThirdPartyApi,
  backupClaudeSettings,
  restoreClaudeSettings,
  hasAnthropicEnv,
  clearAnthropicEnv,
  writeClaudeSettings,
  readClaudeSettings,
} from '../utils/claude-settings.js';
import { launchClaude, launchOfficialClaude, waitForExit } from '../utils/launcher.js';

/**
 * 官方模式: 启动官方 Claude（清除第三方配置）
 * @param passthroughArgs 传递给 Claude CLI 的参数
 */
export async function runOfficial(passthroughArgs: string[] = []): Promise<void> {
  const proxyConfig = getProxyConfig();
  const claudeProxy = getClaudeProxy();

  // 备份当前配置
  const backup = backupClaudeSettings();

  // 需要清除的配置
  let needsRestore = false;

  // 1. 总是清除第三方 endpoint 配置
  if (backup.env?.ANTHROPIC_BASE_URL || backup.env?.ANTHROPIC_AUTH_TOKEN) {
    removeThirdPartyApi();
    needsRestore = true;
    console.log('已临时清除第三方 endpoint 配置');
  }

  // 2. 根据 clearForOfficial 决定是否清除 proxy
  const shouldClearProxy = proxyConfig.clearForOfficial && claudeProxy !== undefined;
  const useProxy = shouldClearProxy ? undefined : claudeProxy;

  if (shouldClearProxy) {
    deleteClaudeProxy();
    needsRestore = true;
    console.log('已临时清除代理配置');
  }

  if (needsRestore) {
    console.log('Claude 退出后将恢复配置...');
  }

  // 启动官方 Claude
  const child = launchOfficialClaude(useProxy, passthroughArgs);
  const exitCode = await waitForExit(child);

  // 恢复配置
  if (needsRestore) {
    restoreClaudeSettings(backup);
    console.log('已恢复配置');
  }

  process.exit(exitCode);
}

/**
 * Provider 模式: 使用指定 endpoint 启动 Claude
 * @param providerName provider 名称
 * @param configureClaude 是否配置原生 claude 命令
 * @param passthroughArgs 传递给 Claude CLI 的参数
 */
export async function runProvider(providerName: string, configureClaude: boolean, passthroughArgs: string[] = []): Promise<void> {
  // 获取 endpoint 配置
  const endpoint = getEndpointConfig(providerName);
  if (!endpoint) {
    console.error(`错误: 未找到 endpoint "${providerName}"`);
    console.log('使用 "runcc list" 查看可用的 endpoints');
    process.exit(1);
  }

  // 获取 token
  let token = endpoint.token || getToken(providerName);
  if (!token) {
    token = await promptToken(providerName);
    saveToken(providerName, token);
  }

  // 更新最后使用
  setLastUsed(providerName);

  // 获取代理配置
  const proxyConfig = getProxyConfig();
  const proxyUrl = proxyConfig.enabled ? proxyConfig.url : undefined;

  // 备份并清理 settings.json 中的 ANTHROPIC env 配置
  const backup = backupClaudeSettings();
  let needsRestore = false;

  if (hasAnthropicEnv(backup)) {
    // 使用深拷贝，保留原始 backup 用于恢复
    const forWrite = structuredClone(backup);
    clearAnthropicEnv(forWrite);
    writeClaudeSettings(forWrite);
    needsRestore = true;
    console.log('已临时清除 settings.json 中的 ANTHROPIC 配置');
  }

  if (needsRestore && !configureClaude) {
    console.log('Claude 退出后将恢复配置...');
  }

  // 如果需要配置原生 claude 命令（持久化模式）
  if (configureClaude) {
    setThirdPartyApi(endpoint.endpoint, token, endpoint.models);
    console.log(`已配置原生 claude 命令使用 ${providerName}`);
    console.log('使用 "runcc --claude" 可恢复官方配置');
  }

  // 启动 Claude
  const child = launchClaude({
    apiEndpoint: endpoint.endpoint,
    apiKey: token,
    proxyUrl,
    models: endpoint.models,
  }, passthroughArgs);

  const exitCode = await waitForExit(child);

  // 恢复配置（仅在非持久化模式下恢复）
  if (needsRestore && !configureClaude) {
    restoreClaudeSettings(backup);
    console.log('已恢复配置');
  }

  process.exit(exitCode);
}

/**
 * 恢复原生 claude 命令使用官方 endpoint
 * @param passthroughArgs 传递给 Claude CLI 的参数（可选）
 */
export function restoreOfficial(passthroughArgs: string[] = []): void {
  removeThirdPartyApi();
  console.log('已恢复原生 claude 命令使用官方 endpoint');

  // 如果提供了透传参数，启动 Claude
  if (passthroughArgs.length > 0) {
    console.log('透传参数:', passthroughArgs);
    const child = launchOfficialClaude(undefined, passthroughArgs);
    waitForExit(child).then((exitCode) => process.exit(exitCode));
  }
}

/**
 * 获取 endpoint 配置（内置或自定义）
 */
function getEndpointConfig(name: string): Endpoint | undefined {
  // 先查找内置
  if (isBuiltinEndpoint(name)) {
    return getBuiltinEndpoint(name);
  }

  // 查找自定义
  const custom = getCustomEndpoints();
  return custom.find((ep) => ep.name === name);
}

/**
 * 提示用户输入 token
 */
async function promptToken(providerName: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question(`请输入 ${providerName} 的 API Token: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
