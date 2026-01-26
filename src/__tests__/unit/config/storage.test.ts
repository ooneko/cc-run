/**
 * storage.ts 单元测试
 * 测试配置文件的读写操作
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  readConfig,
  writeConfig,
  getCustomEndpoints,
  addCustomEndpoint,
  removeCustomEndpoint,
  getToken,
  saveToken,
  clearToken,
  setCustomEndpointToken,
  getLastUsed,
  setLastUsed,
  getProxyConfig,
  setProxyConfig,
  getConfigFilePath,
} from '../../../config/storage.js';
import { createMockFs, cleanupMockFs } from '../../fixtures/mock-fs.js';
import type { CcRunConfig } from '../../../config/types.js';

describe('storage.ts - 配置存储管理', () => {
  let mockFs: ReturnType<typeof createMockFs>;

  // 在每个测试前创建新的 Mock 环境
  beforeEach(() => {
    mockFs = createMockFs();
  });

  // 在每个测试后清理 Mock 环境
  afterEach(() => {
    cleanupMockFs(mockFs);
  });

  // 重置 Mock 环境的辅助函数
  function resetMockFs() {
    cleanupMockFs(mockFs);
    mockFs = createMockFs();
  }

  // ========================================================================
  // readConfig() 测试
  // ========================================================================

  describe('readConfig()', () => {
    test('当配置文件不存在时，应返回默认配置', () => {
      // 确保没有配置文件
      const config = readConfig();

      expect(config).toEqual({
        endpoints: [],
        tokens: {},
        proxy: { enabled: false },
      });
    });

    test('当配置文件存在时，应正确读取', () => {
      // 创建配置文件
      const testConfig: CcRunConfig = {
        endpoints: [
          { name: 'test', endpoint: 'https://test.com', token: 'test-token' },
        ],
        tokens: { glm: 'glm-token' },
        lastUsed: 'glm',
        proxy: { enabled: true, url: 'http://proxy.com' },
      };
      writeConfig(testConfig);

      // 读取验证
      const config = readConfig();

      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints?.[0].name).toBe('test');
      expect(config.tokens?.glm).toBe('glm-token');
      expect(config.lastUsed).toBe('glm');
      expect(config.proxy?.enabled).toBe(true);
      expect(config.proxy?.url).toBe('http://proxy.com');
    });

    test('当配置文件 JSON 损坏时，应返回默认配置并输出错误', () => {
      const { writeFileSync, mkdirSync } = require('node:fs');
      const { join } = require('node:path');

      // 创建目录和损坏的 JSON 文件
      const configDir = join(process.env.HOME, '.runcc');
      mkdirSync(configDir, { recursive: true });
      const configFile = join(configDir, 'config.json');
      writeFileSync(configFile, 'invalid json content', 'utf-8');

      // 读取应返回默认配置
      const config = readConfig();

      expect(config).toEqual({
        endpoints: [],
        tokens: {},
        proxy: { enabled: false },
      });
    });

    test('当配置文件为空对象时，应返回空配置', () => {
      const { writeFileSync, mkdirSync } = require('node:fs');
      const { join } = require('node:path');

      // 创建目录和空配置文件
      const configDir = join(process.env.HOME, '.runcc');
      mkdirSync(configDir, { recursive: true });
      const configFile = join(configDir, 'config.json');
      writeFileSync(configFile, '{}', 'utf-8');

      const config = readConfig();

      expect(config).toEqual({});
    });
  });

  // ========================================================================
  // writeConfig() 测试
  // ========================================================================

  describe('writeConfig()', () => {
    test('应创建配置目录并写入文件', () => {
      const config: CcRunConfig = {
        endpoints: [{ name: 'test', endpoint: 'https://test.com' }],
      };

      writeConfig(config);

      // 验证文件存在
      const { existsSync, readFileSync } = require('node:fs');
      const { join } = require('node:path');
      const configFile = join(process.env.HOME, '.runcc', 'config.json');

      expect(existsSync(configFile)).toBe(true);

      // 验证文件内容
      const content = readFileSync(configFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.endpoints).toHaveLength(1);
      expect(parsed.endpoints[0].name).toBe('test');
    });

    test('应覆盖已存在的配置文件', () => {
      // 写入初始配置
      writeConfig({ endpoints: [{ name: 'old', endpoint: 'https://old.com' }] });

      // 覆盖新配置
      writeConfig({ endpoints: [{ name: 'new', endpoint: 'https://new.com' }] });

      // 读取验证
      const config = readConfig();

      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints?.[0].name).toBe('new');
    });
  });

  // ========================================================================
  // endpoints 相关测试
  // ========================================================================

  describe('getCustomEndpoints()', () => {
    test('当没有自定义 endpoints 时，应返回空数组', () => {
      const endpoints = getCustomEndpoints();

      expect(endpoints).toEqual([]);
    });

    test('应返回所有自定义 endpoints', () => {
      const config: CcRunConfig = {
        endpoints: [
          { name: 'ep1', endpoint: 'https://ep1.com' },
          { name: 'ep2', endpoint: 'https://ep2.com' },
        ],
      };
      writeConfig(config);

      const endpoints = getCustomEndpoints();

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0].name).toBe('ep1');
      expect(endpoints[1].name).toBe('ep2');
    });
  });

  describe('addCustomEndpoint()', () => {
    test('应添加新的 endpoint', () => {
      addCustomEndpoint('test', 'https://test.com', 'token', {
        haiku: 'haiku-model',
      });

      const endpoints = getCustomEndpoints();

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].name).toBe('test');
      expect(endpoints[0].endpoint).toBe('https://test.com');
      expect(endpoints[0].token).toBe('token');
      expect(endpoints[0].models?.haiku).toBe('haiku-model');
    });

    test('当 endpoint 已存在时，应更新配置', () => {
      // 添加初始 endpoint
      addCustomEndpoint('test', 'https://old.com', 'old-token', undefined);

      // 更新同名 endpoint
      addCustomEndpoint('test', 'https://new.com', 'new-token', {
        opus: 'opus-model',
      });

      const endpoints = getCustomEndpoints();

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].endpoint).toBe('https://new.com');
      expect(endpoints[0].token).toBe('new-token');
      expect(endpoints[0].models?.opus).toBe('opus-model');
    });

    test('应保留其他 endpoints', () => {
      addCustomEndpoint('ep1', 'https://ep1.com', 'token1', undefined);
      addCustomEndpoint('ep2', 'https://ep2.com', 'token2', undefined);

      const endpoints = getCustomEndpoints();

      expect(endpoints).toHaveLength(2);
    });
  });

  describe('removeCustomEndpoint()', () => {
    test('应删除指定的 endpoint', () => {
      addCustomEndpoint('ep1', 'https://ep1.com', 'token1', undefined);
      addCustomEndpoint('ep2', 'https://ep2.com', 'token2', undefined);

      const removed = removeCustomEndpoint('ep1');

      expect(removed).toBe(true);

      const endpoints = getCustomEndpoints();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].name).toBe('ep2');
    });

    test('当 endpoint 不存在时，应返回 false', () => {
      const removed = removeCustomEndpoint('non-existent');

      expect(removed).toBe(false);
    });

    test('当没有 endpoints 时，应返回 false', () => {
      const removed = removeCustomEndpoint('test');

      expect(removed).toBe(false);
    });
  });

  // ========================================================================
  // token 相关测试
  // ========================================================================

  describe('getToken()', () => {
    test('应返回指定 provider 的 token', () => {
      const config: CcRunConfig = {
        tokens: { glm: 'glm-token', deepseek: 'deepseek-token' },
      };
      writeConfig(config);

      const glmToken = getToken('glm');
      const deepseekToken = getToken('deepseek');

      expect(glmToken).toBe('glm-token');
      expect(deepseekToken).toBe('deepseek-token');
    });

    test('当 token 不存在时，应返回 undefined', () => {
      const token = getToken('non-existent');

      expect(token).toBeUndefined();
    });

    test('当 tokens 未定义时，应返回 undefined', () => {
      const token = getToken('test');

      expect(token).toBeUndefined();
    });
  });

  describe('saveToken()', () => {
    test('应保存指定 provider 的 token', () => {
      saveToken('glm', 'my-glm-token');

      const token = getToken('glm');

      expect(token).toBe('my-glm-token');
    });

    test('应覆盖已存在的 token', () => {
      saveToken('glm', 'old-token');
      saveToken('glm', 'new-token');

      const token = getToken('glm');

      expect(token).toBe('new-token');
    });

    test('应保留其他 provider 的 tokens', () => {
      saveToken('glm', 'glm-token');
      saveToken('deepseek', 'deepseek-token');

      const config = readConfig();

      expect(config.tokens?.glm).toBe('glm-token');
      expect(config.tokens?.deepseek).toBe('deepseek-token');
    });
  });

  describe('clearToken()', () => {
    test('应清除指定 provider 的 token', () => {
      saveToken('glm', 'glm-token');

      clearToken('glm');

      const token = getToken('glm');
      expect(token).toBeUndefined();
    });

    test('当 token 不存在时，应保持不变', () => {
      clearToken('missing');

      const config = readConfig();
      expect(config.tokens).toEqual({});
    });

    test('当 tokens 未定义时，应保持不变', () => {
      writeConfig({ endpoints: [] });

      clearToken('glm');

      const config = readConfig();
      expect(config.tokens).toBeUndefined();
    });
  });

  describe('setCustomEndpointToken()', () => {
    test('应更新自定义 endpoint 的 token', () => {
      addCustomEndpoint('custom', 'https://custom.com', 'old-token', { haiku: 'h' });

      const updated = setCustomEndpointToken('custom', 'new-token');

      expect(updated).toBe(true);
      const endpoints = getCustomEndpoints();
      expect(endpoints[0].token).toBe('new-token');
    });

    test('应在没有 token 时设置 token', () => {
      addCustomEndpoint('custom', 'https://custom.com', '', { haiku: 'h' });

      const updated = setCustomEndpointToken('custom', 'set-token');

      expect(updated).toBe(true);
      const endpoints = getCustomEndpoints();
      expect(endpoints[0].token).toBe('set-token');
    });

    test('当 endpoint 不存在时，应返回 false', () => {
      const updated = setCustomEndpointToken('missing', 'token');

      expect(updated).toBe(false);
    });
  });

  // ========================================================================
  // lastUsed 相关测试
  // ========================================================================

  describe('getLastUsed()', () => {
    test('应返回最后使用的 provider', () => {
      const config: CcRunConfig = { lastUsed: 'glm' };
      writeConfig(config);

      const lastUsed = getLastUsed();

      expect(lastUsed).toBe('glm');
    });

    test('当未设置时，应返回 undefined', () => {
      const lastUsed = getLastUsed();

      expect(lastUsed).toBeUndefined();
    });
  });

  describe('setLastUsed()', () => {
    test('应设置最后使用的 provider', () => {
      setLastUsed('deepseek');

      const lastUsed = getLastUsed();

      expect(lastUsed).toBe('deepseek');
    });

    test('应覆盖已存在的值', () => {
      setLastUsed('glm');
      setLastUsed('deepseek');

      const lastUsed = getLastUsed();

      expect(lastUsed).toBe('deepseek');
    });
  });

  // ========================================================================
  // proxy 相关测试
  // ========================================================================

  describe('getProxyConfig()', () => {
    test('应返回代理配置', () => {
      const config: CcRunConfig = {
        proxy: {
          enabled: true,
          url: 'http://proxy.com:8080',
          clearForOfficial: true,
        },
      };
      writeConfig(config);

      const proxy = getProxyConfig();

      expect(proxy.enabled).toBe(true);
      expect(proxy.url).toBe('http://proxy.com:8080');
      expect(proxy.clearForOfficial).toBe(true);
    });

    test('当 proxy 未设置时，应返回默认配置', () => {
      const proxy = getProxyConfig();

      expect(proxy).toEqual({ enabled: false });
    });
  });

  describe('setProxyConfig()', () => {
    test('应设置完整代理配置', () => {
      setProxyConfig(true, 'http://proxy.com:8080', true);

      const proxy = getProxyConfig();

      expect(proxy.enabled).toBe(true);
      expect(proxy.url).toBe('http://proxy.com:8080');
      expect(proxy.clearForOfficial).toBe(true);
    });

    test('应设置仅启用状态的代理配置', () => {
      setProxyConfig(true);

      const proxy = getProxyConfig();

      expect(proxy.enabled).toBe(true);
      expect(proxy.url).toBeUndefined();
      expect(proxy.clearForOfficial).toBeUndefined();
    });

    test('应设置启用和 URL 的代理配置', () => {
      setProxyConfig(true, 'http://proxy.com');

      const proxy = getProxyConfig();

      expect(proxy.enabled).toBe(true);
      expect(proxy.url).toBe('http://proxy.com');
    });

    test('应禁用代理', () => {
      setProxyConfig(true, 'http://proxy.com');
      setProxyConfig(false);

      const proxy = getProxyConfig();

      expect(proxy.enabled).toBe(false);
      expect(proxy.url).toBeUndefined();
      expect(proxy.clearForOfficial).toBeUndefined();
    });

    test('应覆盖已存在的代理配置', () => {
      setProxyConfig(true, 'http://old.com', false);
      setProxyConfig(true, 'http://new.com', true);

      const proxy = getProxyConfig();

      expect(proxy.url).toBe('http://new.com');
      expect(proxy.clearForOfficial).toBe(true);
    });
  });

  // ========================================================================
  // getConfigFilePath() 测试
  // ========================================================================

  describe('getConfigFilePath()', () => {
    test('应返回配置文件的完整路径', () => {
      const path = getConfigFilePath();

      expect(path).toMatch(/\.runcc\/config\.json$/);
      expect(path).toContain('.runcc');
    });
  });
});
