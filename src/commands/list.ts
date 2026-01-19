/**
 * List 命令
 * 列出所有可用的 endpoints
 */

import { BUILTIN_ENDPOINTS } from '../config/endpoints.js';
import { getCustomEndpoints, getToken } from '../config/storage.js';

function safeLog(message: string): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(message + '\n');
  process.stdout.write(data);
}

function formatEndpoint(name: string, endpoint: string, hasToken: boolean): string {
  const tokenStatus = hasToken ? '已配置 token' : '未配置 token';
  return `  ${name.padEnd(12)} ${endpoint} (${tokenStatus})`;
}

export function list(): void {
  safeLog('可用的 Endpoints:');
  safeLog('');

  safeLog('内置:');
  for (const ep of BUILTIN_ENDPOINTS) {
    const token = getToken(ep.name);
    safeLog(formatEndpoint(ep.name, ep.endpoint, !!token));
  }

  const custom = getCustomEndpoints();
  if (custom.length > 0) {
    safeLog('');
    safeLog('自定义:');
    for (const ep of custom) {
      safeLog(formatEndpoint(ep.name, ep.endpoint, !!ep.token));
    }
  } else {
    safeLog('');
    safeLog('自定义: 无');
  }
}
