/**
 * Token 命令集成测试
 * 测试 token set/clean 的行为
 */

import { beforeEach, afterEach, test, expect, mock, describe } from 'bun:test';

// ⚠️ 关键：必须在任何导入被测模块之前设置 readline mock
import { setupGlobalMock, setAnswers, getGlobalQuestions, clearGlobalState } from '../../fixtures/mock-readline.js';
setupGlobalMock();

import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
  readCcRunConfig,
} from '../../fixtures/mock-fs.js';
import type { CcRunConfig } from '../../../config/types.js';

function setReadlineAnswers(answers: (string | null)[]) {
  setAnswers(answers);
}

function getReadlineQuestions() {
  return getGlobalQuestions();
}

function clearReadlineState() {
  clearGlobalState();
}

/** Mock process.exit - 抛出错误阻止真实退出 */
function mockProcessExit() {
  const originalExit = globalThis.process.exit;
  const mockFn = mock((code?: number) => {
    throw new Error(`process.exit(${code})`);
  });
  globalThis.process.exit = mockFn as any;
  return { mockFn, originalExit };
}

/** 当前 Mock FS 上下文 */
let mockFsContext: ReturnType<typeof createMockFs>;
/** 原始 process.exit 函数 */
let originalExit: typeof globalThis.process.exit;
/** Mock process.exit 函数 */
let mockExit: ReturnType<typeof mock>;

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

describe('token - token 管理', () => {
  beforeEach(() => {
    mockFsContext = createMockFs();
    const exitMock = mockProcessExit();
    mockExit = exitMock.mockFn;
    originalExit = exitMock.originalExit;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    clearReadlineState();
    globalThis.process.exit = originalExit;
  });

  describe('token set', () => {
    test('应保存内置 provider 的 token（参数传入）', async () => {
      const { tokenSet } = await import('../../../commands/token.js');

      await tokenSet('glm', 'new-token');

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.tokens?.glm).toBe('new-token');
    });

    test('未传入 token 时应提示用户输入', async () => {
      const { tokenSet } = await import('../../../commands/token.js');

      setReadlineAnswers(['prompt-token']);

      await tokenSet('deepseek');

      const questions = getReadlineQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain('deepseek');

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.tokens?.deepseek).toBe('prompt-token');
    });

    test('应更新自定义 endpoint 的 token', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'custom',
          endpoint: 'https://custom.api.com/v1/',
          token: 'old-token',
          models: { haiku: 'custom-haiku' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { tokenSet } = await import('../../../commands/token.js');

      await tokenSet('custom', 'new-token');

      const updated = readCcRunConfig() as CcRunConfig;
      expect(updated.endpoints?.[0].token).toBe('new-token');
    });

    test('provider 不存在时应退出', async () => {
      const { tokenSet } = await import('../../../commands/token.js');

      try {
        await tokenSet('missing', 'token');
      } catch (e) {}

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('token clean', () => {
    test('应清除内置 provider 的 token', async () => {
      const config = createDefaultConfig();
      config.tokens = { glm: 'glm-token' };
      createCcRunConfig(config as Record<string, unknown>);

      const { tokenClean } = await import('../../../commands/token.js');

      tokenClean('glm');

      const updated = readCcRunConfig() as CcRunConfig;
      expect(updated.tokens?.glm).toBeUndefined();
    });

    test('应清除自定义 endpoint 的 token', async () => {
      const config = createDefaultConfig();
      config.endpoints = [
        {
          name: 'custom',
          endpoint: 'https://custom.api.com/v1/',
          token: 'custom-token',
          models: { haiku: 'custom-haiku' },
        },
      ];
      createCcRunConfig(config as Record<string, unknown>);

      const { tokenClean } = await import('../../../commands/token.js');

      tokenClean('custom');

      const updated = readCcRunConfig() as CcRunConfig;
      expect(updated.endpoints?.[0].token).toBeUndefined();
    });

    test('provider 不存在时应退出', async () => {
      const { tokenClean } = await import('../../../commands/token.js');

      try {
        tokenClean('missing');
      } catch (e) {}

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
