/**
 * Token 命令
 * token set/clean
 */

import { createInterface } from 'node:readline';
import { isBuiltinEndpoint } from '../config/endpoints.js';
import {
  getCustomEndpoints,
  getToken,
  saveToken,
  clearToken,
  setCustomEndpointToken,
} from '../config/storage.js';

function isCustomEndpoint(name: string): boolean {
  const endpoints = getCustomEndpoints();
  return endpoints.some((ep) => ep.name === name);
}

function assertProviderExists(name: string): void {
  if (isBuiltinEndpoint(name) || isCustomEndpoint(name)) {
    return;
  }

  console.error(`错误: 未找到 endpoint "${name}"`);
  console.log('使用 "runcc list" 查看可用的 endpoints');
  process.exit(1);
}

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

export async function tokenSet(provider: string, token?: string): Promise<void> {
  assertProviderExists(provider);

  let finalToken = token;
  if (!finalToken) {
    finalToken = await promptToken(provider);
  }

  if (isBuiltinEndpoint(provider)) {
    saveToken(provider, finalToken);
  } else {
    setCustomEndpointToken(provider, finalToken);
  }

  console.log(`已保存 ${provider} 的 token`);
}

export function tokenClean(provider: string): void {
  assertProviderExists(provider);

  if (isBuiltinEndpoint(provider)) {
    const existing = getToken(provider);
    if (existing) {
      clearToken(provider);
      console.log(`已清除 ${provider} 的 token`);
    } else {
      console.log(`未配置 ${provider} 的 token`);
    }
    return;
  }

  const endpoints = getCustomEndpoints();
  const endpoint = endpoints.find((ep) => ep.name === provider);
  const hadToken = !!endpoint?.token;

  setCustomEndpointToken(provider, undefined);

  if (hadToken) {
    console.log(`已清除 ${provider} 的 token`);
  } else {
    console.log(`未配置 ${provider} 的 token`);
  }
}
