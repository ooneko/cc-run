/**
 * 文件系统 Mock 工具
 * 用于隔离测试环境，避免污染用户真实配置文件
 *
 * 核心机制：
 * 1. 临时重写 process.env.HOME 指向临时目录
 * 2. 提供便捷的配置文件创建/清理方法
 * 3. 使用 beforeEach/afterEach 自动管理生命周期
 */

import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Mock 文件系统上下文
 */
export interface MockFsContext {
  /** 临时 HOME 目录路径 */
  tmpHome: string;
  /** 原始 HOME 目录路径 */
  originalHome: string;
}

/** 当前激活的 Mock 上下文 */
let currentContext: MockFsContext | null = null;

/**
 * 创建 Mock 文件系统环境
 *
 * 使用方式：
 * ```ts
 * import { describe, test, beforeEach, afterEach } from 'bun:test';
 * import { createMockFs, cleanupMockFs } from './fixtures/mock-fs.js';
 *
 * describe('配置存储测试', () => {
 *   let mockFs: MockFsContext;
 *
 *   beforeEach(() => {
 *     mockFs = createMockFs();
 *   });
 *
 *   afterEach(() => {
 *     cleanupMockFs(mockFs);
 *   });
 *
 *   test('应该正确保存配置', () => {
 *     // 在这里使用 ~/.runcc/config.json 会指向临时目录
 *     const configPath = join(mockFs.tmpHome, '.runcc', 'config.json');
 *     // ...
 *   });
 * });
 * ```
 */
export function createMockFs(): MockFsContext {
  if (currentContext) {
    throw new Error('Mock FS already active. Call cleanupMockFs() first.');
  }

  // 创建临时目录
  const tmpHome = mkdtempSync(join(tmpdir(), 'runcc-test-'));
  const originalHome = process.env.HOME || '';
  const originalTestHome = process.env.CC_RUN_TEST_HOME;

  // 重写 HOME 环境变量和 CC_RUN_TEST_HOME
  process.env.HOME = tmpHome;
  process.env.CC_RUN_TEST_HOME = tmpHome;

  currentContext = { tmpHome, originalHome };

  // 保存原始的 CC_RUN_TEST_HOME 以便恢复
  (currentContext as any).originalTestHome = originalTestHome;

  return currentContext;
}

/**
 * 清理 Mock 文件系统环境
 * @param context Mock 上下文
 */
export function cleanupMockFs(context: MockFsContext): void {
  if (!currentContext || currentContext !== context) {
    throw new Error('No matching Mock FS context to cleanup.');
  }

  // 恢复原始 HOME 环境变量
  process.env.HOME = context.originalHome;

  // 恢复原始 CC_RUN_TEST_HOME
  const originalTestHome = (context as any).originalTestHome;
  if (originalTestHome === undefined) {
    delete process.env.CC_RUN_TEST_HOME;
  } else {
    process.env.CC_RUN_TEST_HOME = originalTestHome;
  }

  // 删除临时目录
  try {
    rmSync(context.tmpHome, { recursive: true, force: true });
  } catch (error) {
    console.warn(`清理临时目录失败: ${error}`);
  }

  currentContext = null;
}

/**
 * 获取当前 Mock 环境的临时 HOME 路径
 * @returns 临时 HOME 路径
 */
export function getMockHome(): string {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }
  return currentContext.tmpHome;
}

/**
 * 创建 runcc 配置文件
 * @param config 配置内容
 */
export function createCcRunConfig(config: Record<string, unknown>): void {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const configDir = join(currentContext.tmpHome, '.runcc');
  const configFile = join(configDir, 'config.json');

  // 确保目录存在
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 创建 Claude 配置文件
 * @param settings 配置内容
 */
export function createClaudeSettings(settings: Record<string, unknown>): void {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const settingsDir = join(currentContext.tmpHome, '.claude');
  const settingsFile = join(settingsDir, 'settings.json');

  // 确保目录存在
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * 读取 runcc 配置文件
 * @returns 配置内容
 */
export function readCcRunConfig(): Record<string, unknown> {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const configFile = join(currentContext.tmpHome, '.runcc', 'config.json');

  if (!existsSync(configFile)) {
    throw new Error('配置文件不存在');
  }

  const content = readFileSync(configFile, 'utf-8');
  return JSON.parse(content);
}

/**
 * 读取 Claude 配置文件
 * @returns 配置内容
 */
export function readClaudeSettingsConfig(): Record<string, unknown> {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const settingsFile = join(currentContext.tmpHome, '.claude', 'settings.json');

  if (!existsSync(settingsFile)) {
    throw new Error('Claude 配置文件不存在');
  }

  const content = readFileSync(settingsFile, 'utf-8');
  return JSON.parse(content);
}

/**
 * 检查 runcc 配置文件是否存在
 * @returns 是否存在
 */
export function hasCcRunConfig(): boolean {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const configFile = join(currentContext.tmpHome, '.runcc', 'config.json');
  return existsSync(configFile);
}

/**
 * 检查 Claude 配置文件是否存在
 * @returns 是否存在
 */
export function hasClaudeSettingsConfig(): boolean {
  if (!currentContext) {
    throw new Error('Mock FS not active. Call createMockFs() first.');
  }

  const settingsFile = join(currentContext.tmpHome, '.claude', 'settings.json');
  return existsSync(settingsFile);
}
