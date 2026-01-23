/**
 * Claude 官方配置管理
 * 负责 ~/.claude/settings.json 的读写操作
 */

import type { ClaudeSettings } from '../config/types.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * 获取 Claude 配置目录
 * @returns 配置目录路径
 */
function getClaudeDir(): string {
  const home = process.env.CC_RUN_TEST_HOME || homedir();
  return join(home, '.claude');
}

/**
 * 获取 Claude 配置文件路径
 * @returns 配置文件路径
 */
export function getClaudeSettingsFilePath(): string {
  return join(getClaudeDir(), 'settings.json');
}

/**
 * 确保配置目录存在
 */
function ensureClaudeDir(): void {
  const dir = getClaudeDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 读取 Claude 配置文件
 * @returns 配置对象，如果文件不存在则返回空配置
 */
export function readClaudeSettings(): ClaudeSettings {
  const settingsFile = getClaudeSettingsFilePath();
  if (!existsSync(settingsFile)) {
    return {};
  }

  try {
    const content = readFileSync(settingsFile, 'utf-8');
    return JSON.parse(content) as ClaudeSettings;
  } catch (error) {
    console.error(`读取 Claude 配置文件失败: ${error}`);
    return {};
  }
}

/**
 * 写入 Claude 配置文件
 * @param settings 配置对象
 */
export function writeClaudeSettings(settings: ClaudeSettings): void {
  ensureClaudeDir();
  writeFileSync(getClaudeSettingsFilePath(), JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * 获取代理配置
 * @returns 代理地址，如果不存在则返回 undefined
 */
export function getClaudeProxy(): string | undefined {
  const settings = readClaudeSettings();
  return settings.proxy;
}

/**
 * 设置代理配置
 * @param url 代理地址
 */
export function setClaudeProxy(url: string): void {
  const settings = readClaudeSettings();
  settings.proxy = url;
  writeClaudeSettings(settings);
}

/**
 * 删除代理配置
 */
export function removeClaudeProxy(): void {
  const settings = readClaudeSettings();
  delete settings.proxy;
  writeClaudeSettings(settings);
}

/**
 * 获取第三方 API 配置
 * @returns apiUrl 和 anthropicApiKey，如果不存在则返回 undefined
 */
export function getThirdPartyApi(): { apiUrl: string; anthropicApiKey: string } | undefined {
  const settings = readClaudeSettings();
  const baseUrl = settings.env?.ANTHROPIC_BASE_URL;
  const authToken = settings.env?.ANTHROPIC_AUTH_TOKEN;
  if (baseUrl && authToken) {
    return {
      apiUrl: baseUrl,
      anthropicApiKey: authToken,
    };
  }
  return undefined;
}

/**
 * 设置第三方 API 配置（持久化到 ~/.claude/settings.json）
 * @param apiUrl API 地址
 * @param apiKey API Key
 * @param models 可选的模型映射
 */
export function setThirdPartyApi(apiUrl: string, apiKey: string, models?: { haiku?: string; opus?: string; sonnet?: string }): void {
  const settings = readClaudeSettings();
  if (!settings.env) {
    settings.env = {};
  }
  settings.env.ANTHROPIC_BASE_URL = apiUrl;
  settings.env.ANTHROPIC_AUTH_TOKEN = apiKey;

  if (models) {
    if (models.haiku) {
      settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = models.haiku;
    }
    if (models.opus) {
      settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = models.opus;
    }
    if (models.sonnet) {
      settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = models.sonnet;
    }
  }

  writeClaudeSettings(settings);
}

/**
 * 删除第三方 API 配置（从 ~/.claude/settings.json 中删除）
 */
export function removeThirdPartyApi(): void {
  const settings = readClaudeSettings();
  if (settings.env) {
    delete settings.env.ANTHROPIC_BASE_URL;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
    delete settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    delete settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
    delete settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    if (Object.keys(settings.env).length === 0) {
      delete settings.env;
    }
  }
  writeClaudeSettings(settings);
}

/**
 * 备份当前配置（用于临时清除后恢复）
 * @returns 备份的配置对象
 */
export function backupClaudeSettings(): ClaudeSettings {
  return readClaudeSettings();
}

/**
 * 恢复配置备份
 * @param backup 备份的配置对象
 */
export function restoreClaudeSettings(backup: ClaudeSettings): void {
  writeClaudeSettings(backup);
}

/** 需要清理的 ANTHROPIC 环境变量 */
const ANTHROPIC_ENV_KEYS = [
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
] as const;

/**
 * 检查是否有需要清理的 ANTHROPIC env 配置
 * @param settings 配置对象
 * @returns 是否存在 ANTHROPIC 环境变量配置
 */
export function hasAnthropicEnv(settings: ClaudeSettings): boolean {
  if (!settings.env) return false;
  return ANTHROPIC_ENV_KEYS.some((key) => !!settings.env![key]);
}

/**
 * 清理 env 字段中的 ANTHROPIC 相关配置
 * @param settings 配置对象（会被直接修改）
 */
export function clearAnthropicEnv(settings: ClaudeSettings): void {
  if (settings.env) {
    for (const key of ANTHROPIC_ENV_KEYS) {
      delete settings.env[key];
    }
    if (Object.keys(settings.env).length === 0) {
      delete settings.env;
    }
  }
}
