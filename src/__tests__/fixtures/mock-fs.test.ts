/**
 * Mock 文件系统工具验证测试
 * 确保 Mock 工具本身正常工作
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
  createClaudeSettings,
  readCcRunConfig,
  readClaudeSettingsConfig,
  hasCcRunConfig,
  hasClaudeSettingsConfig,
  getMockHome,
} from './mock-fs.js';

describe('Mock FS 工具验证', () => {
  let mockFs: ReturnType<typeof createMockFs>;

  beforeEach(() => {
    mockFs = createMockFs();
  });

  afterEach(() => {
    cleanupMockFs(mockFs);
  });

  test('应该创建临时 HOME 目录', () => {
    const tmpHome = getMockHome();
    expect(tmpHome).toBeDefined();
    expect(tmpHome).toContain('runcc-test-');
    // HOME 已被重写，所以它们应该相等
    expect(tmpHome).toBe(process.env.HOME);
  });

  test('应该创建 runcc 配置文件', () => {
    createCcRunConfig({
      endpoints: [],
      tokens: { glm: 'test-token' },
    });

    expect(hasCcRunConfig()).toBe(true);

    const config = readCcRunConfig() as { tokens?: Record<string, string> };
    expect(config.tokens?.glm).toBe('test-token');
  });

  test('应该创建 Claude 配置文件', () => {
    createClaudeSettings({
      proxy: 'http://127.0.0.1:7890',
      apiUrl: 'https://api.test.com',
    });

    expect(hasClaudeSettingsConfig()).toBe(true);

    const settings = readClaudeSettingsConfig() as { proxy?: string; apiUrl?: string };
    expect(settings.proxy).toBe('http://127.0.0.1:7890');
    expect(settings.apiUrl).toBe('https://api.test.com');
  });

  test('应该正确检测不存在的配置文件', () => {
    expect(hasCcRunConfig()).toBe(false);
    expect(hasClaudeSettingsConfig()).toBe(false);
  });

  test('读取不存在的配置文件应该抛出错误', () => {
    expect(() => readCcRunConfig()).toThrow('配置文件不存在');
    expect(() => readClaudeSettingsConfig()).toThrow('Claude 配置文件不存在');
  });
});
