/**
 * claude-settings.ts 单元测试
 * 测试 Claude 配置文件的读写操作
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  readClaudeSettings,
  writeClaudeSettings,
  getClaudeProxy,
  setClaudeProxy,
  removeClaudeProxy,
  getThirdPartyApi,
  setThirdPartyApi,
  removeThirdPartyApi,
  getClaudeSettingsFilePath,
  backupClaudeSettings,
  restoreClaudeSettings,
  hasAnthropicEnv,
  clearAnthropicEnv,
} from '../../../utils/claude-settings.js';
import { createMockFs, cleanupMockFs } from '../../fixtures/mock-fs.js';
import type { ClaudeSettings } from '../../../config/types.js';

describe('claude-settings.ts - Claude 配置管理', () => {
  let mockFs: ReturnType<typeof createMockFs>;

  beforeEach(() => {
    mockFs = createMockFs();
  });

  afterEach(() => {
    cleanupMockFs(mockFs);
  });

  // ========================================================================
  // readClaudeSettings() / writeClaudeSettings() 测试
  // ========================================================================

  describe('readClaudeSettings()', () => {
    test('当配置文件不存在时，应返回空对象', () => {
      const settings = readClaudeSettings();

      expect(settings).toEqual({});
    });

    test('当配置文件存在时，应正确读取', () => {
      const testSettings: ClaudeSettings = {
        proxy: 'http://proxy.com:8080',
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      };
      writeClaudeSettings(testSettings);

      const settings = readClaudeSettings();

      expect(settings.proxy).toBe('http://proxy.com:8080');
      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');
      expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });

    test('当配置文件 JSON 损坏时，应返回空对象并输出错误', () => {
      const { writeFileSync, mkdirSync } = require('node:fs');
      const { join } = require('node:path');

      const settingsDir = join(process.env.HOME, '.claude');
      mkdirSync(settingsDir, { recursive: true });
      const settingsFile = join(settingsDir, 'settings.json');
      writeFileSync(settingsFile, 'invalid json content', 'utf-8');

      const settings = readClaudeSettings();

      expect(settings).toEqual({});
    });
  });

  describe('writeClaudeSettings()', () => {
    test('应创建配置目录并写入文件', () => {
      const settings: ClaudeSettings = {
        proxy: 'http://proxy.com',
      };

      writeClaudeSettings(settings);

      const { existsSync, readFileSync } = require('node:fs');
      const { join } = require('node:path');
      const settingsFile = join(process.env.HOME, '.claude', 'settings.json');

      expect(existsSync(settingsFile)).toBe(true);

      const content = readFileSync(settingsFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.proxy).toBe('http://proxy.com');
    });

    test('应覆盖已存在的配置文件', () => {
      writeClaudeSettings({ proxy: 'http://old.com' });
      writeClaudeSettings({ proxy: 'http://new.com' });

      const settings = readClaudeSettings();

      expect(settings.proxy).toBe('http://new.com');
    });
  });

  // ========================================================================
  // proxy 相关测试
  // ========================================================================

  describe('getClaudeProxy()', () => {
    test('应返回代理配置', () => {
      writeClaudeSettings({ proxy: 'http://proxy.com:8080' });

      const proxy = getClaudeProxy();

      expect(proxy).toBe('http://proxy.com:8080');
    });

    test('当 proxy 未设置时，应返回 undefined', () => {
      const proxy = getClaudeProxy();

      expect(proxy).toBeUndefined();
    });
  });

  describe('setClaudeProxy()', () => {
    test('应设置代理配置', () => {
      setClaudeProxy('http://proxy.com');

      const proxy = getClaudeProxy();

      expect(proxy).toBe('http://proxy.com');
    });

    test('应覆盖已存在的代理配置', () => {
      setClaudeProxy('http://old.com');
      setClaudeProxy('http://new.com');

      const proxy = getClaudeProxy();

      expect(proxy).toBe('http://new.com');
    });

    test('应保留其他配置', () => {
      writeClaudeSettings({
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      });
      setClaudeProxy('http://proxy.com');

      const settings = readClaudeSettings();

      expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(settings.proxy).toBe('http://proxy.com');
    });
  });

  describe('removeClaudeProxy()', () => {
    test('应删除代理配置', () => {
      setClaudeProxy('http://proxy.com');
      removeClaudeProxy();

      const proxy = getClaudeProxy();

      expect(proxy).toBeUndefined();
    });

    test('应保留其他配置', () => {
      writeClaudeSettings({
        proxy: 'http://proxy.com',
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      });
      removeClaudeProxy();

      const settings = readClaudeSettings();

      expect(settings.proxy).toBeUndefined();
      expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });

    test('当 proxy 不存在时，不应报错', () => {
      expect(() => removeClaudeProxy()).not.toThrow();
    });
  });

  // ========================================================================
  // 第三方 API 相关测试
  // ========================================================================

  describe('getThirdPartyApi()', () => {
    test('应返回第三方 API 配置', () => {
      writeClaudeSettings({
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      const api = getThirdPartyApi();

      expect(api).toEqual({
        apiUrl: 'https://api.example.com',
        anthropicApiKey: 'sk-test-key',
      });
    });

    test('当配置不完整时，应返回 undefined', () => {
      writeClaudeSettings({
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      });

      const api = getThirdPartyApi();

      expect(api).toBeUndefined();
    });

    test('当配置不存在时，应返回 undefined', () => {
      const api = getThirdPartyApi();

      expect(api).toBeUndefined();
    });
  });

  describe('setThirdPartyApi()', () => {
    test('应设置第三方 API 配置', () => {
      setThirdPartyApi('https://api.example.com', 'sk-test-key');

      const api = getThirdPartyApi();

      expect(api?.apiUrl).toBe('https://api.example.com');
      expect(api?.anthropicApiKey).toBe('sk-test-key');
    });

    test('应覆盖已存在的配置', () => {
      setThirdPartyApi('https://old.com', 'sk-old-key');
      setThirdPartyApi('https://new.com', 'sk-new-key');

      const api = getThirdPartyApi();

      expect(api?.apiUrl).toBe('https://new.com');
      expect(api?.anthropicApiKey).toBe('sk-new-key');
    });

    test('应保留其他配置', () => {
      writeClaudeSettings({ proxy: 'http://proxy.com' });
      setThirdPartyApi('https://api.example.com', 'sk-test-key');

      const settings = readClaudeSettings();

      expect(settings.proxy).toBe('http://proxy.com');
      expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');
    });

    test('应设置模型映射配置', () => {
      setThirdPartyApi('https://api.example.com', 'sk-test-key', {
        haiku: 'haiku-model',
        opus: 'opus-model',
        sonnet: 'sonnet-model',
      });

      const settings = readClaudeSettings();

      expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');
      expect(settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('haiku-model');
      expect(settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('opus-model');
      expect(settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('sonnet-model');
    });
  });

  describe('removeThirdPartyApi()', () => {
    test('应删除第三方 API 配置', () => {
      setThirdPartyApi('https://api.example.com', 'sk-test-key');
      removeThirdPartyApi();

      const api = getThirdPartyApi();

      expect(api).toBeUndefined();
    });

    test('应保留其他配置', () => {
      writeClaudeSettings({
        proxy: 'http://proxy.com',
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku-model',
        },
      });
      removeThirdPartyApi();

      const settings = readClaudeSettings();

      expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
      expect(settings.proxy).toBe('http://proxy.com');
    });

    test('当配置不存在时，不应报错', () => {
      expect(() => removeThirdPartyApi()).not.toThrow();
    });

    test('当清理后 env 为空时，应删除 env 字段', () => {
      setThirdPartyApi('https://api.example.com', 'sk-test-key');
      removeThirdPartyApi();

      const settings = readClaudeSettings();

      expect(settings.env).toBeUndefined();
    });
  });

  // ========================================================================
  // 备份恢复测试
  // ========================================================================

  describe('backupClaudeSettings()', () => {
    test('应备份当前配置', () => {
      const originalSettings: ClaudeSettings = {
        proxy: 'http://proxy.com',
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      };
      writeClaudeSettings(originalSettings);

      const backup = backupClaudeSettings();

      expect(backup).toEqual(originalSettings);
    });

    test('当配置为空时，应返回空对象', () => {
      const backup = backupClaudeSettings();

      expect(backup).toEqual({});
    });
  });

  describe('restoreClaudeSettings()', () => {
    test('应恢复配置备份', () => {
      const backup: ClaudeSettings = {
        proxy: 'http://proxy.com',
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      };

      restoreClaudeSettings(backup);

      const settings = readClaudeSettings();

      expect(settings).toEqual(backup);
    });

    test('应覆盖当前配置', () => {
      writeClaudeSettings({ proxy: 'http://old.com' });

      const backup: ClaudeSettings = {
        proxy: 'http://new.com',
      };
      restoreClaudeSettings(backup);

      const settings = readClaudeSettings();

      expect(settings.proxy).toBe('http://new.com');
    });
  });

  // ========================================================================
  // ANTHROPIC 环境变量清理测试
  // ========================================================================

  describe('hasAnthropicEnv()', () => {
    test('当存在 ANTHROPIC 环境变量时，应返回 true', () => {
      const settings: ClaudeSettings = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token',
        },
      };

      expect(hasAnthropicEnv(settings)).toBe(true);
    });

    test('当不存在 ANTHROPIC 环境变量时，应返回 false', () => {
      const settings: ClaudeSettings = {
        env: {
          OTHER_VAR: 'value',
        },
      };

      expect(hasAnthropicEnv(settings)).toBe(false);
    });

    test('当 env 未定义时，应返回 false', () => {
      const settings: ClaudeSettings = {};

      expect(hasAnthropicEnv(settings)).toBe(false);
    });

    test('应检测所有 ANTHROPIC 环境变量', () => {
      const settings: ClaudeSettings = {
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku-model',
        },
      };

      expect(hasAnthropicEnv(settings)).toBe(true);
    });
  });

  describe('clearAnthropicEnv()', () => {
    test('应清理所有 ANTHROPIC 环境变量', () => {
      const settings: ClaudeSettings = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token',
          ANTHROPIC_BASE_URL: 'https://api.example.com',
          OTHER_VAR: 'value',
        },
      };

      clearAnthropicEnv(settings);

      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(settings.env?.OTHER_VAR).toBe('value');
    });

    test('当清理后 env 为空时，应删除 env 字段', () => {
      const settings: ClaudeSettings = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token',
        },
      };

      clearAnthropicEnv(settings);

      expect(settings.env).toBeUndefined();
    });

    test('当 env 未定义时，不应报错', () => {
      const settings: ClaudeSettings = {};

      expect(() => clearAnthropicEnv(settings)).not.toThrow();
    });

    test('应清理所有预定义的 ANTHROPIC 环境变量', () => {
      const settings: ClaudeSettings = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'token',
          ANTHROPIC_BASE_URL: 'url',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus',
        },
      };

      clearAnthropicEnv(settings);

      expect(hasAnthropicEnv(settings)).toBe(false);
    });
  });

  // ========================================================================
  // getClaudeSettingsFilePath() 测试
  // ========================================================================

  describe('getClaudeSettingsFilePath()', () => {
    test('应返回配置文件的完整路径', () => {
      const path = getClaudeSettingsFilePath();

      expect(path).toMatch(/\.claude\/settings\.json$/);
      expect(path).toContain('.claude');
    });

    test('应使用测试环境的 HOME 路径', () => {
      const path = getClaudeSettingsFilePath();

      const expectedHome = process.env.CC_RUN_TEST_HOME || process.env.HOME;
      expect(expectedHome).toBeDefined();
      expect(path).toContain(expectedHome as string);
    });
  });
});
