/**
 * CC-Run 内置 Endpoints 配置
 */

import type { Endpoint } from './types.js';

/**
 * 内置的第三方 API endpoints
 */
export const BUILTIN_ENDPOINTS: Endpoint[] = [
  {
    name: 'glm',
    endpoint: 'https://open.bigmodel.cn/api/anthropic',
    models: {
      haiku: 'glm-4.7',
      opus: 'glm-4.7',
      sonnet: 'glm-4.7',
    },
  },
  {
    name: 'deepseek',
    endpoint: 'https://api.deepseek.com/anthropic',
    models: {
      haiku: 'deepseek-chat',
      opus: 'deepseek-chat',
      sonnet: 'deepseek-chat',
    },
  },
  {
    name: 'minimax',
    endpoint: 'https://api.minimax.io/anthropic',
    models: {
      haiku: 'MiniMax-M2',
      opus: 'MiniMax-M2',
      sonnet: 'MiniMax-M2',
    },
  },
];

/**
 * 获取指定名称的内置 endpoint
 * @param name endpoint 名称
 * @returns endpoint 配置，如果不存在则返回 undefined
 */
export function getBuiltinEndpoint(name: string): Endpoint | undefined {
  return BUILTIN_ENDPOINTS.find((ep) => ep.name === name);
}

/**
 * 检查指定名称是否为内置 endpoint
 * @param name endpoint 名称
 * @returns 是否为内置 endpoint
 */
export function isBuiltinEndpoint(name: string): boolean {
  return BUILTIN_ENDPOINTS.some((ep) => ep.name === name);
}

/**
 * 获取所有内置 endpoint 的名称列表
 * @returns endpoint 名称数组
 */
export function getBuiltinEndpointNames(): string[] {
  return BUILTIN_ENDPOINTS.map((ep) => ep.name);
}
