/**
 * Remove 命令集成测试
 * 测试删除自定义 endpoint 功能
 *
 * 关键设计决策：
 * 1. remove.ts 不涉及用户交互，无需 readline mock
 * 2. 依赖 mock-fs 提供配置文件管理
 * 3. 需要捕获 console.error/console.log 输出进行验证
 */

import { beforeEach, afterEach, test, expect, mock, describe } from 'bun:test';

import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
  readCcRunConfig,
} from '../../fixtures/mock-fs.js';
import type { CcRunConfig } from '../../../config/types.js';

/** 当前 Mock FS 上下文 */
let mockFsContext: ReturnType<typeof createMockFs>;
/** 原始 process.exit 函数 */
let originalExit: typeof globalThis.process.exit;
/** Mock process.exit 函数 */
let mockExit: ReturnType<typeof mock>;
/** 捕获的 console.log 输出 */
let consoleLogOutput: string[];
/** 捕获的 console.error 输出 */
let consoleErrorOutput: string[];

/**
 * 创建默认配置
 */
function createDefaultConfig(): CcRunConfig {
  return {
    endpoints: [],
    tokens: {},
    lastUsed: undefined,
    proxy: {
      enabled: false,
      url: '',
      clearForOfficial: false,
    },
  };
}

/**
 * Mock console.log 和 console.error
 */
function mockConsoleOutput() {
  consoleLogOutput = [];
  consoleErrorOutput = [];

  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    consoleLogOutput.push(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) => {
    consoleErrorOutput.push(args.map(String).join(' '));
  };

  return { originalLog, originalError };
}

/**
 * 恢复 console.log 和 console.error
 */
function restoreConsoleOutput(originalLog: typeof console.log, originalError: typeof console.error) {
  console.log = originalLog;
  console.error = originalError;
}

describe('remove - 删除自定义 endpoint', () => {
  beforeEach(() => {
    mockFsContext = createMockFs();

    // Mock process.exit
    originalExit = globalThis.process.exit;
    mockExit = mock((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
    globalThis.process.exit = mockExit as any;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    globalThis.process.exit = originalExit;
  });

  describe('输入验证', () => {
    test('应该拒绝删除内置 endpoint "glm"', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const { remove } = require('../../../commands/remove.js');

      try {
        remove('glm');
      } catch (e) {
        // process.exit(1) 会抛出错误
      }

      restoreConsoleOutput(originalLog, originalError);

      // 验证错误消息
      expect(consoleErrorOutput).toHaveLength(1);
      expect(consoleErrorOutput[0]).toContain('不能删除内置 endpoint');
      expect(consoleErrorOutput[0]).toContain('glm');

      // 验证 process.exit(1) 被调用
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('应该拒绝删除所有内置 endpoint（deepseek, minimax）', () => {
      const { remove } = require('../../../commands/remove.js');

      const builtinEndpoints = ['deepseek', 'minimax'];

      for (const name of builtinEndpoints) {
        const { originalLog, originalError } = mockConsoleOutput();

        try {
          remove(name);
        } catch (e) {
          // process.exit(1) 会抛出错误
        }

        restoreConsoleOutput(originalLog, originalError);

        expect(consoleErrorOutput).toHaveLength(1);
        expect(consoleErrorOutput[0]).toContain('不能删除内置 endpoint');
        expect(consoleErrorOutput[0]).toContain(name);
        expect(mockExit).toHaveBeenCalledWith(1);
      }
    });
  });

  describe('删除成功', () => {
    test('应该成功删除存在的自定义 endpoint', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      // 创建包含自定义 endpoint 的配置
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'custom1',
          endpoint: 'https://custom1.api.com/v1/',
          token: 'token1',
          models: { haiku: 'model1' },
        },
        {
          name: 'custom2',
          endpoint: 'https://custom2.api.com/v1/',
          token: 'token2',
          models: { haiku: 'model2' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      // 删除 custom1
      remove('custom1');

      restoreConsoleOutput(originalLog, originalError);

      // 验证控制台输出
      expect(consoleLogOutput).toHaveLength(1);
      expect(consoleLogOutput[0]).toContain('已删除 endpoint');
      expect(consoleLogOutput[0]).toContain('custom1');

      // 验证配置更新
      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toHaveLength(1);
      expect(updatedConfig.endpoints![0].name).toBe('custom2');

      // 验证没有调用 process.exit（成功删除）
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('删除 endpoint 后应保留配置的其他部分', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      // 创建完整配置
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'to-remove',
          endpoint: 'https://remove.api.com/v1/',
          token: 'remove-token',
          models: { haiku: 'remove-model' },
        },
      ];
      config.tokens = { glm: 'glm-token', custom: 'custom-token' };
      config.lastUsed = 'to-remove';
      config.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      remove('to-remove');

      restoreConsoleOutput(originalLog, originalError);

      // 验证其他配置保留
      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toHaveLength(0);
      expect(updatedConfig.tokens).toEqual({ glm: 'glm-token', custom: 'custom-token' });
      expect(updatedConfig.lastUsed).toBe('to-remove'); // lastUsed 未被清除
      expect(updatedConfig.proxy?.enabled).toBe(true);
      expect(updatedConfig.proxy?.url).toBe('http://proxy.example.com:8080');
    });

    test('删除最后一个 endpoint 后 endpoints 应为空数组', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'only-one',
          endpoint: 'https://only.api.com/v1/',
          token: 'token',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      remove('only-one');

      restoreConsoleOutput(originalLog, originalError);

      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toEqual([]);
    });
  });

  describe('错误处理', () => {
    test('应该拒绝删除不存在的自定义 endpoint', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      // 创建空的配置
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      try {
        remove('non-existent');
      } catch (e) {
        // process.exit(1) 会抛出错误
      }

      restoreConsoleOutput(originalLog, originalError);

      // 验证错误消息
      expect(consoleErrorOutput).toHaveLength(1);
      expect(consoleErrorOutput[0]).toContain('未找到自定义 endpoint');
      expect(consoleErrorOutput[0]).toContain('non-existent');

      // 验证 process.exit(1) 被调用
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('删除不存在的 endpoint 时不应修改配置', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'existing',
          endpoint: 'https://existing.api.com/v1/',
          token: 'token',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      try {
        remove('non-existent');
      } catch (e) {
        // process.exit(1) 会抛出错误
      }

      restoreConsoleOutput(originalLog, originalError);

      // 验证配置未被修改
      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toHaveLength(1);
      expect(updatedConfig.endpoints![0].name).toBe('existing');
    });
  });

  describe('边界情况', () => {
    test('应该正确处理包含空格的 endpoint 名称', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'my custom',
          endpoint: 'https://custom.api.com/v1/',
          token: 'token',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      remove('my custom');

      restoreConsoleOutput(originalLog, originalError);

      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toHaveLength(0);
    });

    test('应该正确处理特殊字符的 endpoint 名称', () => {
      const specialNames = ['my-custom_endpoint', 'custom.endpoint', 'endpoint123'];

      for (const name of specialNames) {
        // 每次测试都需要重新创建配置
        const config = createDefaultConfig();
        config.endpoints = [
          {
            name,
            endpoint: `https://${name}.api.com/v1/`,
            token: 'token',
            models: { haiku: 'model' },
          },
        ];
        createCcRunConfig(config as Record<string, unknown>);

        const { originalLog, originalError } = mockConsoleOutput();

        const { remove } = require('../../../commands/remove.js');

        remove(name);

        restoreConsoleOutput(originalLog, originalError);

        const updatedConfig = readCcRunConfig() as CcRunConfig;
        expect(updatedConfig.endpoints).toHaveLength(0);
      }
    });

    test('连续删除多个 endpoint 应该全部成功', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'endpoint1',
          endpoint: 'https://endpoint1.api.com/v1/',
          token: 'token1',
          models: { haiku: 'model1' },
        },
        {
          name: 'endpoint2',
          endpoint: 'https://endpoint2.api.com/v1/',
          token: 'token2',
          models: { haiku: 'model2' },
        },
        {
          name: 'endpoint3',
          endpoint: 'https://endpoint3.api.com/v1/',
          token: 'token3',
          models: { haiku: 'model3' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      // 清空之前的输出
      consoleLogOutput = [];

      // 连续删除
      remove('endpoint1');
      remove('endpoint2');
      remove('endpoint3');

      restoreConsoleOutput(originalLog, originalError);

      // 验证三次删除都有成功输出
      expect(consoleLogOutput).toHaveLength(3);
      expect(consoleLogOutput[0]).toContain('endpoint1');
      expect(consoleLogOutput[1]).toContain('endpoint2');
      expect(consoleLogOutput[2]).toContain('endpoint3');

      // 验证配置为空
      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toEqual([]);
    });

    test('从多个 endpoints 中删除中间的一个', () => {
      const { originalLog, originalError } = mockConsoleOutput();

      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'first',
          endpoint: 'https://first.api.com/v1/',
          token: 'token1',
          models: { haiku: 'model1' },
        },
        {
          name: 'middle',
          endpoint: 'https://middle.api.com/v1/',
          token: 'token2',
          models: { haiku: 'model2' },
        },
        {
          name: 'last',
          endpoint: 'https://last.api.com/v1/',
          token: 'token3',
          models: { haiku: 'model3' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { remove } = require('../../../commands/remove.js');

      remove('middle');

      restoreConsoleOutput(originalLog, originalError);

      const updatedConfig = readCcRunConfig() as CcRunConfig;
      expect(updatedConfig.endpoints).toHaveLength(2);
      expect(updatedConfig.endpoints![0].name).toBe('first');
      expect(updatedConfig.endpoints![1].name).toBe('last');
    });
  });
});
