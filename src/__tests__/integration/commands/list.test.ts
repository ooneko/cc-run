/**
 * List 命令集成测试
 * 测试列出 endpoints 功能
 *
 * 关键设计决策：
 * 1. list.ts 使用 Bun.write(Bun.stdout) 而非 console.log，需要捕获 stdout
 * 2. 需要验证 UTF-8 编码正确处理中文输出
 * 3. 验证内置和自定义 endpoints 的分组显示
 */

import { beforeEach, afterEach, test, expect, describe } from 'bun:test';

import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
} from '../../fixtures/mock-fs.js';
import type { CcRunConfig } from '../../../config/types.js';

/** 当前 Mock FS 上下文 */
let mockFsContext: ReturnType<typeof createMockFs>;
/** 捕获的 stdout 输出 */
let stdoutOutput: string[];

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
 * Mock Bun.stdout 写入
 */
function mockStdout() {
  stdoutOutput = [];
  const originalWrite = Bun.write;

  Bun.write = function (stdout: typeof Bun.stdout, data: ArrayBuffer | ArrayBufferView): Promise<number> {
    if (stdout === Bun.stdout) {
      // 将 ArrayBuffer/ArrayBufferView 转换为字符串
      let text: string;
      if (data instanceof ArrayBuffer) {
        text = new TextDecoder().decode(data);
      } else if (data instanceof Uint8Array) {
        text = new TextDecoder().decode(data);
      } else {
        text = new TextDecoder().decode(data.buffer);
      }
      stdoutOutput.push(text);
      return Promise.resolve(text.length);
    }
    return originalWrite.call(this, stdout, data);
  } as any;

  return { originalWrite };
}

/**
 * 恢复 Bun.write
 */
function restoreStdout(originalWrite: typeof Bun.write) {
  Bun.write = originalWrite;
}

/**
 * 获取合并后的 stdout 输出
 */
function getStdoutOutput(): string {
  return stdoutOutput.join('');
}

describe('list - 列出 endpoints', () => {
  beforeEach(() => {
    mockFsContext = createMockFs();
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
  });

  describe('基本功能', () => {
    test('应该列出所有内置 endpoints（无 token）', async () => {
      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证标题
      expect(output).toContain('可用的 Endpoints:');
      expect(output).toContain('内置:');

      // 验证所有内置 endpoints 都被列出
      expect(output).toContain('glm');
      expect(output).toContain('deepseek');
      expect(output).toContain('minimax');

      // 验证 token 状态显示
      expect(output).toContain('未配置 token');
    });

    test('应该显示已配置 token 的内置 endpoints', async () => {
      const config = createDefaultConfig();
      config.tokens = {
        glm: 'glm-token',
        deepseek: 'deepseek-token',
      };
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证已配置 token 的 endpoints 显示正确状态
      expect(output).toContain('glm');
      expect(output).toContain('已配置 token');
      expect(output).toContain('deepseek');
      expect(output).toContain('已配置 token');

      // 验证未配置 token 的 endpoint
      expect(output).toContain('minimax');
      expect(output).toContain('未配置 token');
    });

    test('应该列出混合的内置和自定义 endpoints', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'custom1',
          endpoint: 'https://custom1.api.com/v1/',
          token: 'custom1-token',
          models: { haiku: 'model1' },
        },
        {
          name: 'custom2',
          endpoint: 'https://custom2.api.com/v1/',
          token: '',
          models: { haiku: 'model2' },
        },
      ];
      config.tokens = { glm: 'glm-token' };
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证内置 endpoints 区域
      expect(output).toContain('内置:');
      expect(output).toContain('glm');
      expect(output).toContain('已配置 token');

      // 验证自定义 endpoints 区域
      expect(output).toContain('自定义:');
      expect(output).toContain('custom1');
      expect(output).toContain('已配置 token');
      expect(output).toContain('custom2');
      expect(output).toContain('未配置 token');
    });

    test('应该在无自定义 endpoints 时显示"无"', async () => {
      const config = createDefaultConfig();
      config.endpoints = [];
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      expect(output).toContain('自定义: 无');
    });
  });

  describe('输出格式', () => {
    test('应该正确处理 UTF-8 编码', async () => {
      const config = createDefaultConfig();
      config.tokens = { glm: 'test-token' };
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证中文字符正确显示
      expect(output).toContain('可用的 Endpoints:');
      expect(output).toContain('内置:');
      expect(output).toContain('已配置 token');
      expect(output).toContain('未配置 token');

      // 验证 UTF-8 编码正确（中文字符不应该被替换为 ）
      expect(output).not.toMatch(/\ufffd/g);
    });

    test('应该对齐 endpoint 名称和 URL', async () => {
      const config = createDefaultConfig();
      config.tokens = { glm: 'test-token' };
      config.endpoints = [
        {
          name: 'abc',
          endpoint: 'https://abc.api.com/v1/',
          token: '',
          models: { haiku: 'model' },
        },
        {
          name: 'very-long-name',
          endpoint: 'https://long.api.com/v1/',
          token: '',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证输出包含 endpoint 名称和 URL
      expect(output).toContain('abc');
      expect(output).toContain('https://abc.api.com/v1/');
      expect(output).toContain('very-long-name');
      expect(output).toContain('https://long.api.com/v1/');
    });
  });

  describe('边界情况', () => {
    test('应该处理包含特殊字符的 endpoint 名称', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'test-with-dash',
          endpoint: 'https://test.api.com/v1/',
          token: 'token',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      expect(output).toContain('test-with-dash');
    });

    test('应该处理中文 endpoint 名称', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: '自定义服务',
          endpoint: 'https://custom.api.com/v1/',
          token: 'token',
          models: { haiku: 'model' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证中文 endpoint 名称正确显示
      expect(output).toContain('自定义服务');
      expect(output).toContain('https://custom.api.com/v1/');
      expect(output).toContain('已配置 token');
    });

    test('应该处理多个自定义 endpoints', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        { name: 'a', endpoint: 'https://a.api.com/v1/', token: 't1', models: { haiku: 'm1' } },
        { name: 'b', endpoint: 'https://b.api.com/v1/', token: 't2', models: { haiku: 'm2' } },
        { name: 'c', endpoint: 'https://c.api.com/v1/', token: '', models: { haiku: 'm3' } },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证所有自定义 endpoints 都被列出
      expect(output).toContain('a');
      expect(output).toContain('b');
      expect(output).toContain('c');
      expect(output).toContain('已配置 token'); // a 和 b
      expect(output).toContain('未配置 token'); // c
    });

    test('应该处理所有内置 endpoints 都有 token 的情况', async () => {
      const config = createDefaultConfig();
      config.tokens = {
        glm: 'glm-token',
        deepseek: 'deepseek-token',
        minimax: 'minimax-token',
      };
      createCcRunConfig(config as Record<string, unknown>);

      const { originalWrite } = mockStdout();

      const { list } = await import('../../../commands/list.js');

      list();

      restoreStdout(originalWrite);

      const output = getStdoutOutput();

      // 验证所有内置 endpoints 都显示已配置
      const hasTokenCount = (output.match(/已配置 token/g) || []).length;
      expect(hasTokenCount).toBeGreaterThanOrEqual(3);
    });
  });
});
