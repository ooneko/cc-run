/**
 * Add 命令集成测试
 * 测试添加自定义 endpoint 功能
 *
 * 关键设计决策：
 * 1. readline mock 使用共享的全局 mock（在测试文件加载时初始化）
 * 2. 每个 describe 块独立管理文件系统 mock（通过 beforeEach/afterEach）
 * 3. readline mock 支持动态设置答案队列
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

// readline mock 辅助函数（包装共享的全局 mock）
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

describe('add - 添加自定义 endpoint', () => {
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

  describe('输入验证', () => {
    test('应该拒绝内置 endpoint 名称', async () => {
      const { add } = await import('../../../commands/add.js');

      // 尝试使用内置 endpoint 名称
      setReadlineAnswers(['test-token', 'test-model']);

      try {
        await add('glm', 'https://api.test.com');
      } catch (e) {
        // process.exit(1) 会抛出错误
      }

      clearReadlineState();

      // 验证 process.exit(1) 被调用
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('应该拒绝所有内置 endpoint 名称（deepseek, minimax）', async () => {
      const { add } = await import('../../../commands/add.js');

      const builtinEndpoints = ['deepseek', 'minimax'];

      for (const name of builtinEndpoints) {
        setReadlineAnswers(['test-token', 'test-model']);

        try {
          await add(name, 'https://api.test.com');
        } catch (e) {
          // process.exit(1) 会抛出错误
        }

        clearReadlineState();

        expect(mockExit).toHaveBeenCalledWith(1);
      }
    });

    test('应该拒绝无效的 endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.com',
        '://missing-protocol',
        '',
      ];

      for (const url of invalidUrls) {
        setReadlineAnswers(['test-token', 'test-model']);

        try {
          await add('custom', url);
        } catch (e) {
          // process.exit(1) 会抛出错误
        }

        clearReadlineState();

        expect(mockExit).toHaveBeenCalledWith(1);
      }
    });

    test('应该接受有效的 HTTP endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'http://api.example.com/v1/');

      clearReadlineState();

      // 验证没有调用 process.exit（成功添加）
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('应该接受有效的 HTTPS endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      // 验证没有调用 process.exit（成功添加）
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('用户交互', () => {
    test('应该提示用户输入 API Token', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['my-api-token', 'my-model']);

      await add('custom', 'https://api.example.com/v1/');

      // 在清空状态之前先验证问题
      const questions = getReadlineQuestions();
      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('custom');
      expect(questions[0]).toContain('API Token');

      clearReadlineState();
    });

    test('应该提示用户输入模型名称', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['my-api-token', 'my-model']);

      await add('custom', 'https://api.example.com/v1/');

      // 在清空状态之前先验证问题
      const questions = getReadlineQuestions();
      expect(questions).toHaveLength(2);
      expect(questions[1]).toContain('模型名称');

      clearReadlineState();
    });

    test('应该处理空输入（trim 后）', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['  spaced-token  ', '  spaced-model  ']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints![0].token).toBe('spaced-token');
      expect(config.endpoints![0].models?.haiku).toBe('spaced-model');
    });
  });

  describe('配置存储', () => {
    test('应该成功添加自定义 endpoint 到配置', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints![0]).toEqual({
        name: 'custom',
        endpoint: 'https://api.example.com/v1/',
        token: 'test-token',
        models: {
          haiku: 'test-model',
          opus: 'test-model',
          sonnet: 'test-model',
        },
      });
    });

    test('应该为所有模型类型使用相同的模型名称', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'unified-model']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      const endpoint = config.endpoints![0];
      expect(endpoint.models?.haiku).toBe('unified-model');
      expect(endpoint.models?.opus).toBe('unified-model');
      expect(endpoint.models?.sonnet).toBe('unified-model');
    });

    test('应该保留已存在的其他 endpoints', async () => {
      const { add } = await import('../../../commands/add.js');

      // 先添加一个 endpoint
      const existingConfig = createDefaultConfig();
      existingConfig.endpoints = [
        {
          name: 'existing',
          endpoint: 'https://existing.api.com/v1/',
          token: 'existing-token',
          models: { haiku: 'existing-haiku' },
        },
      ];
      createCcRunConfig(existingConfig as Record<string, unknown>);

      // 再添加一个新的 endpoint
      setReadlineAnswers(['new-token', 'new-model']);

      await add('new-custom', 'https://new.api.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints).toHaveLength(2);
      expect(config.endpoints![0].name).toBe('existing');
      expect(config.endpoints![1].name).toBe('new-custom');
    });

    test('应该保留已存在的 tokens 配置', async () => {
      const { add } = await import('../../../commands/add.js');

      const existingConfig = createDefaultConfig();
      existingConfig.tokens = { glm: 'existing-glm-token' };
      createCcRunConfig(existingConfig as Record<string, unknown>);

      setReadlineAnswers(['new-token', 'new-model']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.tokens?.glm).toBe('existing-glm-token');
    });

    test('应该保留已存在的代理配置', async () => {
      const { add } = await import('../../../commands/add.js');

      const existingConfig = createDefaultConfig();
      existingConfig.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: false,
      };
      createCcRunConfig(existingConfig as Record<string, unknown>);

      setReadlineAnswers(['new-token', 'new-model']);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.proxy?.enabled).toBe(true);
      expect(config.proxy?.url).toBe('http://proxy.example.com:8080');
    });
  });

  describe('边界情况', () => {
    test('应该处理带端口号的 endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'https://api.example.com:8443/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints![0].endpoint).toBe('https://api.example.com:8443/v1/');
    });

    test('应该处理带查询参数的 endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'https://api.example.com/v1/?version=2');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints![0].endpoint).toBe(
        'https://api.example.com/v1/?version=2'
      );
    });

    test('应该处理不带尾部斜杠的 endpoint URL', async () => {
      const { add } = await import('../../../commands/add.js');

      setReadlineAnswers(['test-token', 'test-model']);

      await add('custom', 'https://api.example.com/v1');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints![0].endpoint).toBe('https://api.example.com/v1');
    });

    test('应该处理空格作为 token 和模型名称', async () => {
      const { add } = await import('../../../commands/add.js');

      // 使用 null 模拟空输入（在 mock 中会转换为 ''）
      setReadlineAnswers([null, null]);

      await add('custom', 'https://api.example.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      expect(config.endpoints![0].token).toBe('');
      expect(config.endpoints![0].models?.haiku).toBe('');
    });

    test('应该允许覆盖同名的自定义 endpoint', async () => {
      const { add } = await import('../../../commands/add.js');

      // 先添加一个 endpoint
      const existingConfig = createDefaultConfig();
      existingConfig.endpoints = [
        {
          name: 'custom',
          endpoint: 'https://old.api.com/v1/',
          token: 'old-token',
          models: { haiku: 'old-model' },
        },
      ];
      createCcRunConfig(existingConfig as Record<string, unknown>);

      // 再添加同名 endpoint（覆盖）
      setReadlineAnswers(['new-token', 'new-model']);

      await add('custom', 'https://new.api.com/v1/');

      clearReadlineState();

      const config = readCcRunConfig() as CcRunConfig;
      // addCustomEndpoint 会更新已存在的 endpoint，而不是添加重复项
      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints![0].endpoint).toBe('https://new.api.com/v1/');
      expect(config.endpoints![0].token).toBe('new-token');
      expect(config.endpoints![0].models?.haiku).toBe('new-model');
    });
  });
});
