/**
 * RunCC 配置存储管理
 * 负责 ~/.runcc/config.json 的读写操作
 */

import type { CcRunConfig, Endpoint } from './types.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * 获取配置文件目录
 * @returns 配置文件目录路径
 */
function getConfigDir(): string {
  const home = process.env.CC_RUN_TEST_HOME || homedir();
  return join(home, '.runcc');
}

/**
 * 获取配置文件路径
 * @returns 配置文件路径
 */
export function getConfigFilePath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 读取配置文件
 * @returns 配置对象，如果文件不存在则返回空配置
 */
export function readConfig(): CcRunConfig {
  const filePath = getConfigFilePath();
  if (!existsSync(filePath)) {
    // 返回默认配置的深拷贝，避免共享状态
    return {
      endpoints: [],
      tokens: {},
      proxy: { enabled: false },
    };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as CcRunConfig;
  } catch (error) {
    console.error(`读取配置文件失败: ${error}`);
    // 返回默认配置的深拷贝，避免共享状态
    return {
      endpoints: [],
      tokens: {},
      proxy: { enabled: false },
    };
  }
}

/**
 * 写入配置文件
 * @param config 配置对象
 */
export function writeConfig(config: CcRunConfig): void {
  ensureConfigDir();
  writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 获取所有自定义 endpoints
 * @returns endpoint 数组
 */
export function getCustomEndpoints(): Endpoint[] {
  const config = readConfig();
  return config.endpoints || [];
}

/**
 * 添加自定义 endpoint
 * @param name 名称
 * @param endpoint API 地址
 * @param token API Token
 * @param models 模型映射
 */
export function addCustomEndpoint(
  name: string,
  endpoint: string,
  token: string,
  models: Endpoint['models']
): void {
  const config = readConfig();

  if (!config.endpoints) {
    config.endpoints = [];
  }

  // 检查是否已存在同名 endpoint
  const existingIndex = config.endpoints.findIndex((ep) => ep.name === name);
  if (existingIndex !== -1) {
    // 更新已存在的 endpoint
    config.endpoints[existingIndex] = { name, endpoint, token, models };
  } else {
    // 添加新的 endpoint
    config.endpoints.push({ name, endpoint, token, models });
  }

  writeConfig(config);
}

/**
 * 删除自定义 endpoint
 * @param name endpoint 名称
 * @returns 是否删除成功
 */
export function removeCustomEndpoint(name: string): boolean {
  const config = readConfig();

  if (!config.endpoints) {
    return false;
  }

  const initialLength = config.endpoints.length;
  config.endpoints = config.endpoints.filter((ep) => ep.name !== name);

  if (config.endpoints.length < initialLength) {
    writeConfig(config);
    return true;
  }

  return false;
}

/**
 * 获取指定 provider 的 token
 * @param provider provider 名称
 * @returns token，如果不存在则返回 undefined
 */
export function getToken(provider: string): string | undefined {
  const config = readConfig();
  return config.tokens?.[provider];
}

/**
 * 保存指定 provider 的 token
 * @param provider provider 名称
 * @param token API Token
 */
export function saveToken(provider: string, token: string): void {
  const config = readConfig();

  if (!config.tokens) {
    config.tokens = {};
  }

  config.tokens[provider] = token;
  writeConfig(config);
}

/**
 * 清除指定 provider 的 token
 * @param provider provider 名称
 */
export function clearToken(provider: string): void {
  const config = readConfig();

  if (!config.tokens || !(provider in config.tokens)) {
    return;
  }

  delete config.tokens[provider];
  writeConfig(config);
}

/**
 * 更新自定义 endpoint 的 token
 * @param name endpoint 名称
 * @param token API Token
 * @returns 是否更新成功
 */
export function setCustomEndpointToken(name: string, token?: string): boolean {
  const config = readConfig();

  if (!config.endpoints) {
    return false;
  }

  const existingIndex = config.endpoints.findIndex((ep) => ep.name === name);
  if (existingIndex === -1) {
    return false;
  }

  const endpoint = config.endpoints[existingIndex];
  if (token === undefined) {
    delete endpoint.token;
  } else {
    endpoint.token = token;
  }

  config.endpoints[existingIndex] = endpoint;
  writeConfig(config);
  return true;
}

/**
 * 获取最后使用的 provider
 * @returns provider 名称，如果不存在则返回 undefined
 */
export function getLastUsed(): string | undefined {
  const config = readConfig();
  return config.lastUsed;
}

/**
 * 设置最后使用的 provider
 * @param provider provider 名称
 */
export function setLastUsed(provider: string): void {
  const config = readConfig();
  config.lastUsed = provider;
  writeConfig(config);
}

/**
 * 获取代理配置
 * @returns 代理配置
 */
export function getProxyConfig(): { enabled: boolean; url?: string; clearForOfficial?: boolean } {
  const config = readConfig();
  return config.proxy || { enabled: false };
}

/**
 * 设置代理配置
 * @param enabled 是否启用
 * @param url 代理地址
 * @param clearForOfficial 启动官方 claude 时是否清除 proxy
 */
export function setProxyConfig(enabled: boolean, url?: string, clearForOfficial?: boolean): void {
  const config = readConfig();

  config.proxy = {
    enabled,
    url,
    clearForOfficial,
  };

  writeConfig(config);
}
