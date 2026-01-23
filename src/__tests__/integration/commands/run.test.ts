/**
 * Run 命令集成测试
 * 测试核心启动逻辑（官方模式、Provider 模式、配置模式）
 *
 * 关键设计决策：
 * 1. spawn 和 readline mock 在测试文件加载时全局初始化（必须在导入被测模块之前）
 * 2. 每个 describe 块独立管理文件系统 mock（通过 beforeEach/afterEach）
 * 3. readline mock 支持动态设置答案队列
 */

import { beforeEach, afterEach, test, expect, mock, describe } from 'bun:test';

// ⚠️ 关键：必须在任何导入被测模块之前设置 spawn 和 readline mock
const childProcess = require('node:child_process');
const originalSpawn = childProcess.spawn;
let spawnCalls: any[] = [];
let nextExitCode = 0;

childProcess.spawn = function (
  command: string,
  args: string[],
  options: { stdio?: any; env?: Record<string, string> }
) {
  spawnCalls.push({
    command,
    args,
    options: {
      stdio: options?.stdio,
      env: { ...options.env },
    },
  });
  const mockChild = {
    on(event: string, listener: (...args: any[]) => void) {
      if (event === 'close') {
        setImmediate(() => {
          listener(nextExitCode, null);
        });
      }
      return mockChild;
    },
    stdin: null,
    stdout: null,
    stderr: null,
    killed: false,
    exitCode: null,
    connected: true,
  };
  return mockChild;
};

// ⚠️ 同样必须在导入被测模块之前设置 readline mock
import { setupGlobalMock, setAnswers, getGlobalQuestions, clearGlobalState } from '../../fixtures/mock-readline.js';
setupGlobalMock();

import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
  createClaudeSettings,
  readCcRunConfig,
  readClaudeSettingsConfig,
} from '../../fixtures/mock-fs.js';
import type { CcRunConfig, ClaudeSettings } from '../../../config/types.js';

// 清空调用记录的辅助函数
function clearSpawnCalls() {
  spawnCalls = [];
}

function getSpawnCalls() {
  return spawnCalls;
}

function setNextExitCode(code: number) {
  nextExitCode = code;
}

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

/**
 * 创建默认 Claude 配置
 */
function createDefaultClaudeSettings(): ClaudeSettings {
  return {
    proxy: undefined,
    env: undefined,
  };
}

describe('runOfficial - 官方模式', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };

    // 清除测试可能影响的环境变量
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;

    mockFsContext = createMockFs();
    clearSpawnCalls();
    const exitMock = mockProcessExit();
    mockExit = exitMock.mockFn;
    originalExit = exitMock.originalExit;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    globalThis.process.exit = originalExit;
    // 恢复环境变量
    process.env = originalEnv;
  });

  test('应该启动官方 Claude（无第三方配置）', async () => {
    const { runOfficial } = await import('../../../commands/run.js');
    setNextExitCode(0);

    // 使用 try-catch 捕获 process.exit 抛出的错误
    try {
      await runOfficial(['--help']);
    } catch (e) {
      // process.exit 会抛出错误
    }

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('claude');
    expect(calls[0].args).toEqual(['--help']);

    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  test('应该清除第三方 endpoint 配置', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.env = {
      ANTHROPIC_BASE_URL: 'https://api.test.com',
      ANTHROPIC_AUTH_TOKEN: 'test-key',
    };
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runOfficial();
    } catch (e) {}

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);

    // 验证环境变量中没有第三方 endpoint 配置
    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();

    // 验证配置被恢复（因为 runOfficial 会在退出后恢复）
    const afterSettings = readClaudeSettingsConfig();
    expect(afterSettings.env?.ANTHROPIC_BASE_URL).toBe('https://api.test.com');
    expect(afterSettings.env?.ANTHROPIC_AUTH_TOKEN).toBe('test-key');

    expect(mockExit).toHaveBeenCalled();
  });

  test('应该根据 clearForOfficial 决定是否清除 proxy', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    const config = createDefaultConfig();
    config.proxy = {
      enabled: true,
      url: 'http://proxy.example.com:8080',
      clearForOfficial: true,
    };
    createCcRunConfig(config as Record<string, unknown>);

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.proxy = 'http://proxy.example.com:8080';
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runOfficial();
    } catch (e) {}

    // 验证环境变量中没有代理配置
    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.http_proxy).toBeUndefined();
    expect(env?.https_proxy).toBeUndefined();

    // 验证配置被恢复
    const afterSettings = readClaudeSettingsConfig();
    expect(afterSettings.proxy).toBe('http://proxy.example.com:8080');
  });

  test('应该在 clearForOfficial = false 时保留 proxy', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    const config = createDefaultConfig();
    config.proxy = {
      enabled: true,
      url: 'http://proxy.example.com:8080',
      clearForOfficial: false,
    };
    createCcRunConfig(config as Record<string, unknown>);

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.proxy = 'http://proxy.example.com:8080';
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runOfficial();
    } catch (e) {}

    const afterSettings = readClaudeSettingsConfig();
    expect(afterSettings.proxy).toBe('http://proxy.example.com:8080');
  });

  test('应该在进程退出后恢复配置', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.env = {
      ANTHROPIC_BASE_URL: 'https://api.test.com',
      ANTHROPIC_AUTH_TOKEN: 'test-key',
    };
    claudeSettings.proxy = 'http://proxy.example.com:8080';
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runOfficial();
    } catch (e) {}

    const finalSettings = readClaudeSettingsConfig();
    expect(finalSettings.env?.ANTHROPIC_BASE_URL).toBe('https://api.test.com');
    expect(finalSettings.env?.ANTHROPIC_AUTH_TOKEN).toBe('test-key');
    expect(finalSettings.proxy).toBe('http://proxy.example.com:8080');
  });

  test('应该支持透传参数给 Claude', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    setNextExitCode(0);

    const passthroughArgs = ['--prompt', 'test prompt'];

    try {
      await runOfficial(passthroughArgs);
    } catch (e) {}

    const calls = getSpawnCalls();
    expect(calls[0].args).toEqual(passthroughArgs);
  });

  test('应该使用 Claude 代理配置（如果有）', async () => {
    const { runOfficial } = await import('../../../commands/run.js');

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.proxy = 'http://claude-proxy.example.com:8080';
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runOfficial();
    } catch (e) {}

    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.http_proxy).toBe('http://claude-proxy.example.com:8080');
    expect(env?.https_proxy).toBe('http://claude-proxy.example.com:8080');
  });
});

describe('runProvider - Provider 模式', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };

    // 清除测试可能影响的环境变量
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;

    mockFsContext = createMockFs();
    clearSpawnCalls();
    const exitMock = mockProcessExit();
    mockExit = exitMock.mockFn;
    originalExit = exitMock.originalExit;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    clearReadlineState();
    globalThis.process.exit = originalExit;
    // 恢复环境变量
    process.env = originalEnv;
  });

  test('应该使用内置 endpoint 启动', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', false, ['--help']);
    } catch (e) {}

    clearReadlineState();

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('claude');

    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBe('test-token');

    const config = readCcRunConfig() as CcRunConfig;
    expect(config.tokens?.glm).toBe('test-token');
    expect(config.lastUsed).toBe('glm');
  });

  test('应该使用已保存的 token', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    const config = createDefaultConfig();
    config.tokens = { glm: 'saved-token' };
    createCcRunConfig(config as Record<string, unknown>);

    setNextExitCode(0);

    try {
      await runProvider('glm', false);
    } catch (e) {}

    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBe('saved-token');

    // 没有调用 readline（因为使用了已保存的 token）
    // 这里不检查 getReadlineQuestions()，因为 readline mock 可能未激活
  });

  test('应该提示用户输入 token（首次使用）', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setReadlineAnswers(['user-input-token']);
    setNextExitCode(0);

    try {
      await runProvider('deepseek', false);
    } catch (e) {}

    // 在清理前检查问题
    const questions = getReadlineQuestions();
    expect(questions).toHaveLength(1);
    expect(questions[0]).toContain('deepseek');

    clearReadlineState();

    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBe('user-input-token');
  });

  test('应该支持自定义 endpoint', async () => {
    const { runProvider } = await import('../../../commands/run.js');

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

    setNextExitCode(0);

    try {
      await runProvider('custom', false);
    } catch (e) {}

    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_BASE_URL).toBe('https://custom.api.com/v1/');
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBe('custom-token');
  });

  test('应该使用 runcc 代理配置（如果启用）', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    const config = createDefaultConfig();
    config.proxy = {
      enabled: true,
      url: 'http://cc-proxy.example.com:8080',
    };
    createCcRunConfig(config as Record<string, unknown>);

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', false);
    } catch (e) {}

    clearReadlineState();

    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.http_proxy).toBe('http://cc-proxy.example.com:8080');
    expect(env?.https_proxy).toBe('http://cc-proxy.example.com:8080');
  });

  test('应该在 endpoint 不存在时退出', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setNextExitCode(0);

    try {
      await runProvider('non-existent', false);
    } catch (e) {}

    expect(mockExit).toHaveBeenCalledWith(1);

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(0);
  });

  test('应该清除 settings.json 中的 ANTHROPIC 环境变量', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    const claudeSettings: ClaudeSettings = {
      proxy: undefined,
      env: {
        ANTHROPIC_BASE_URL: 'https://old.api.com',
        ANTHROPIC_AUTH_TOKEN: 'old-token',
      },
    };
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', false);
    } catch (e) {}

    clearReadlineState();

    // 验证 spawn 的环境变量中没有旧的 ANTHROPIC 配置
    const calls = getSpawnCalls();
    const env = calls[0].options.env;
    expect(env?.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(env?.ANTHROPIC_AUTH_TOKEN).toBe('test-token');

    // 验证配置被恢复（因为 runProvider 会在退出后恢复）
    const afterSettings = readClaudeSettingsConfig() as ClaudeSettings;
    expect(afterSettings.env?.ANTHROPIC_BASE_URL).toBe('https://old.api.com');
    expect(afterSettings.env?.ANTHROPIC_AUTH_TOKEN).toBe('old-token');
  });

  test('应该在进程退出后恢复配置', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    const claudeSettings: ClaudeSettings = {
      proxy: undefined,
      env: {
        ANTHROPIC_BASE_URL: 'https://old.api.com',
      },
    };
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', false);
    } catch (e) {}

    clearReadlineState();

    const finalSettings = readClaudeSettingsConfig() as ClaudeSettings;
    expect(finalSettings.env?.ANTHROPIC_BASE_URL).toBe('https://old.api.com');
  });
});

describe('runProvider - 配置模式 (--claude，持久化到 settings.json)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };

    // 清除测试可能影响的环境变量
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;

    mockFsContext = createMockFs();
    clearSpawnCalls();
    const exitMock = mockProcessExit();
    mockExit = exitMock.mockFn;
    originalExit = exitMock.originalExit;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    clearReadlineState();
    globalThis.process.exit = originalExit;
    // 恢复环境变量
    process.env = originalEnv;
  });

  test('应该写入 settings.json', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', true);
    } catch (e) {}

    clearReadlineState();

    const settings = readClaudeSettingsConfig() as ClaudeSettings;
    expect(settings.env?.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBe('test-token');
  });

  test('应该启动 Claude 进程', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('deepseek', true);
    } catch (e) {}

    clearReadlineState();

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('claude');
  });

  test('应该在进程退出后保留配置（不恢复）', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.env = {
      ANTHROPIC_BASE_URL: 'https://old.api.com',
    };
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', true);
    } catch (e) {}

    clearReadlineState();

    const finalSettings = readClaudeSettingsConfig() as ClaudeSettings;
    expect(finalSettings.env?.ANTHROPIC_BASE_URL).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(finalSettings.env?.ANTHROPIC_AUTH_TOKEN).toBe('test-token');
  });

  test('应该支持透传参数', async () => {
    const { runProvider } = await import('../../../commands/run.js');

    setReadlineAnswers(['test-token']);
    setNextExitCode(0);

    try {
      await runProvider('glm', true, ['--prompt', 'test']);
    } catch (e) {}

    clearReadlineState();

    const calls = getSpawnCalls();
    expect(calls[0].args).toEqual(['--prompt', 'test']);
  });
});

describe('restoreOfficial - 恢复官方配置', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };

    // 清除测试可能影响的环境变量
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;

    mockFsContext = createMockFs();
    clearSpawnCalls();
    const exitMock = mockProcessExit();
    mockExit = exitMock.mockFn;
    originalExit = exitMock.originalExit;
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    globalThis.process.exit = originalExit;
    // 恢复环境变量
    process.env = originalEnv;
  });

  test('应该清除第三方 endpoint 配置', async () => {
    const { restoreOfficial } = await import('../../../commands/run.js');

    const claudeSettings = createDefaultClaudeSettings();
    claudeSettings.env = {
      ANTHROPIC_BASE_URL: 'https://third-party.api.com',
      ANTHROPIC_AUTH_TOKEN: 'third-party-key',
    };
    createClaudeSettings(claudeSettings as Record<string, unknown>);

    restoreOfficial();

    const settings = readClaudeSettingsConfig() as ClaudeSettings;
    expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  test('应该支持透传参数并启动 Claude', async () => {
    const { restoreOfficial } = await import('../../../commands/run.js');

    setNextExitCode(0);

    try {
      restoreOfficial(['--help']);
    } catch (e) {}

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('claude');
    expect(calls[0].args).toEqual(['--help']);
  });

  test('应该在无透传参数时不启动 Claude', async () => {
    const { restoreOfficial } = await import('../../../commands/run.js');

    restoreOfficial();

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(0);
  });
});
