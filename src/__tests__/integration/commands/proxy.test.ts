/**
 * Proxy 命令集成测试
 * 测试代理管理功能: on, off, reset, status, help
 *
 * 关键设计决策：
 * 1. proxyOn() 涉及用户输入（promptProxyUrl），需要 mock readline
 * 2. 代理命令同时修改 runcc 和 Claude 两个配置文件
 * 3. 需要捕获多行 console.log 输出进行验证
 */

import { beforeEach, afterEach, test, expect, describe } from 'bun:test';

import {
  createMockFs,
  cleanupMockFs,
  createCcRunConfig,
  readCcRunConfig,
  createClaudeSettings,
  readClaudeSettingsConfig,
  hasClaudeSettingsConfig,
} from '../../fixtures/mock-fs.js';
import { mockReadline, cleanupMockReadline } from '../../fixtures/mock-readline.js';
import type { CcRunConfig } from '../../../config/types.js';

/** 当前 Mock FS 上下文 */
let mockFsContext: ReturnType<typeof createMockFs>;
/** 捕获的 console.log 输出 */
let consoleLogOutput: string[];

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
 * Mock console.log
 */
function mockConsoleLog() {
  consoleLogOutput = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    consoleLogOutput.push(args.map(String).join(' '));
  };

  return { originalLog };
}

/**
 * 恢复 console.log
 */
function restoreConsoleLog(originalLog: typeof console.log) {
  console.log = originalLog;
}

describe('proxy - 代理管理', () => {
  beforeEach(() => {
    mockFsContext = createMockFs();
  });

  afterEach(() => {
    cleanupMockFs(mockFsContext);
    try {
      cleanupMockReadline();
    } catch {
      // readline 可能未初始化
    }
  });

  /**
   * 为每个测试创建独立的模块缓存
   * 确保测试之间不会共享状态
   */
  async function requireProxyModule() {
    // 清除模块缓存，确保每个测试都加载新模块
    // 关键：需要清除 node:readline 的缓存，因为 createInterface 的 mock 保留在模块级别
    delete require.cache['node:readline'];
    delete require.cache[require.resolve('../../../commands/proxy.js')];
    delete require.cache[require.resolve('../../../config/storage.js')];
    delete require.cache[require.resolve('../../../utils/claude-settings.js')];
    return await import('../../../commands/proxy.js');
  }

  describe('proxyOn - 开启代理', () => {
    test('首次开启代理应提示用户输入地址', async () => {
      const { originalLog } = mockConsoleLog();

      // Mock readline 输入
      mockReadline(['http://proxy.example.com:8080']);

      // 动态导入被测模块（在 mock 之后）
      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      // 验证控制台输出
      expect(consoleLogOutput).toHaveLength(2);
      expect(consoleLogOutput[0]).toContain('代理已开启');
      expect(consoleLogOutput[0]).toContain('http://proxy.example.com:8080');
      expect(consoleLogOutput[1]).toContain('配置文件');

      // 验证 runcc 配置更新
      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.enabled).toBe(true);
      expect(ccRunConfig.proxy?.url).toBe('http://proxy.example.com:8080');

      // 验证 Claude 配置已写入 proxy
      expect(hasClaudeSettingsConfig()).toBe(true);
      const claudeSettings = readClaudeSettingsConfig();
      expect(claudeSettings.proxy).toBe('http://proxy.example.com:8080');
    });

    test('已有保存的代理地址时应直接使用', async () => {
      const { originalLog } = mockConsoleLog();

      // 创建已有代理配置
      const config = createDefaultConfig();
      config.proxy = {
        enabled: false,
        url: 'http://saved.proxy.com:8891',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      // Mock readline（不会被调用）
      mockReadline([]);

      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      // 验证使用了保存的地址
      expect(consoleLogOutput[0]).toContain('http://saved.proxy.com:8891');

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.url).toBe('http://saved.proxy.com:8891');
    });

    test('开启代理时应保留 clearForOfficial 配置', async () => {
      const { originalLog } = mockConsoleLog();

      // 创建包含 clearForOfficial 的配置
      const config = createDefaultConfig();
      config.proxy = {
        enabled: false,
        url: 'http://test.proxy.com:8080',
        clearForOfficial: true,
      };
      createCcRunConfig(config as Record<string, unknown>);

      mockReadline([]);

      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.clearForOfficial).toBe(true);
    });

    test('用户输入空地址时应保存空字符串', async () => {
      const { originalLog } = mockConsoleLog();

      // 确保从空配置开始
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      // null 模拟用户直接回车，返回空字符串
      mockReadline([null]);

      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      // proxy.ts 中 promptProxyUrl 返回 answer.trim()，空输入返回 ''
      // 但 setProxyConfig 只在 url 有值时设置，所以可能保存为 undefined
      // 这里我们验证实际行为：空字符串会被保存
      expect(ccRunConfig.proxy?.url).toBe('');

      // Claude 配置也会写入空字符串
      const claudeSettings = readClaudeSettingsConfig();
      expect(claudeSettings.proxy).toBe('');
    });
  });

  describe('proxyOff - 关闭代理', () => {
    test('关闭已开启的代理', () => {
      const { originalLog } = mockConsoleLog();

      // 创建已开启的代理配置
      const config = createDefaultConfig();
      config.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      // 创建 Claude 配置
      createClaudeSettings({ proxy: 'http://proxy.example.com:8080' });

      // 同步导入（proxyOff 不需要 readline）
      delete require.cache[require.resolve('../../../commands/proxy.js')];
      const { proxyOff } = require('../../../commands/proxy.js');

      proxyOff();

      restoreConsoleLog(originalLog);

      // 验证控制台输出
      expect(consoleLogOutput).toHaveLength(1);
      expect(consoleLogOutput[0]).toContain('代理已关闭');

      // 验证 runcc 配置更新
      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.enabled).toBe(false);
      expect(ccRunConfig.proxy?.url).toBe('http://proxy.example.com:8080'); // URL 保留

      // 验证 Claude 配置中的 proxy 已删除
      const claudeSettings = readClaudeSettingsConfig();
      expect(claudeSettings.proxy).toBeUndefined();
    });

    test('关闭代理后应保留 URL 和 clearForOfficial 配置', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: true,
        url: 'http://test.proxy.com:8891',
        clearForOfficial: true,
      };
      createCcRunConfig(config as Record<string, unknown>);

      delete require.cache[require.resolve('../../../commands/proxy.js')];
      const { proxyOff } = require('../../../commands/proxy.js');

      proxyOff();

      restoreConsoleLog(originalLog);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.enabled).toBe(false);
      expect(ccRunConfig.proxy?.url).toBe('http://test.proxy.com:8891');
      expect(ccRunConfig.proxy?.clearForOfficial).toBe(true);
    });

    test('关闭未开启的代理应正常执行', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: false,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      delete require.cache[require.resolve('../../../commands/proxy.js')];
      const { proxyOff } = require('../../../commands/proxy.js');

      proxyOff();

      restoreConsoleLog(originalLog);

      // 应该正常输出，不抛出错误
      expect(consoleLogOutput[0]).toContain('代理已关闭');
    });
  });

  describe('proxyReset - 重置代理配置', () => {
    test('重置应清空所有代理配置', () => {
      const { originalLog } = mockConsoleLog();

      // 创建完整代理配置
      const config = createDefaultConfig();
      config.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: true,
      };
      createCcRunConfig(config as Record<string, unknown>);

      // 创建 Claude 配置
      createClaudeSettings({ proxy: 'http://proxy.example.com:8080' });

      delete require.cache[require.resolve('../../../commands/proxy.js')];
      const { proxyReset } = require('../../../commands/proxy.js');

      proxyReset();

      restoreConsoleLog(originalLog);

      // 验证控制台输出
      expect(consoleLogOutput).toHaveLength(1);
      expect(consoleLogOutput[0]).toContain('代理配置已重置');

      // 验证 runcc 配置清空
      // setProxyConfig(false) 会将 url 设为 undefined
      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.enabled).toBe(false);
      expect(ccRunConfig.proxy?.url).toBeUndefined();
      expect(ccRunConfig.proxy?.clearForOfficial).toBeUndefined();

      // 验证 Claude 配置中的 proxy 已删除
      const claudeSettings = readClaudeSettingsConfig();
      expect(claudeSettings.proxy).toBeUndefined();
    });

    test('重置已空的配置应正常执行', () => {
      const { originalLog } = mockConsoleLog();

      // 创建空配置
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      delete require.cache[require.resolve('../../../commands/proxy.js')];
      const { proxyReset } = require('../../../commands/proxy.js');

      proxyReset();

      restoreConsoleLog(originalLog);

      expect(consoleLogOutput[0]).toContain('代理配置已重置');
    });
  });

  describe('proxyStatus - 显示代理状态', () => {
    test('显示已开启的代理状态', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: true,
      };
      createCcRunConfig(config as Record<string, unknown>);

      createClaudeSettings({ proxy: 'http://proxy.example.com:8080' });

      const { proxyStatus } = require('../../../commands/proxy.js');

      proxyStatus();

      restoreConsoleLog(originalLog);

      // 验证输出包含所有状态信息
      const output = consoleLogOutput.join('\n');
      expect(output).toContain('RunCC 代理配置');
      expect(output).toContain('状态: 开启');
      expect(output).toContain('http://proxy.example.com:8080');
      expect(output).toContain('启动官方时清除: 是');
      expect(output).toContain('Claude 配置文件');
      expect(output).toContain('代理: http://proxy.example.com:8080');
    });

    test('显示已关闭的代理状态', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: false,
        url: '',
        clearForOfficial: undefined,
      };
      createCcRunConfig(config as Record<string, unknown>);

      const { proxyStatus } = require('../../../commands/proxy.js');

      proxyStatus();

      restoreConsoleLog(originalLog);

      const output = consoleLogOutput.join('\n');
      expect(output).toContain('状态: 关闭');
      // 不应显示 URL（因为为空）
      expect(output).not.toContain('地址:');
    });

    test('显示已关闭但保存了 URL 的代理状态', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: false,
        url: 'http://saved.proxy.com:8891',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      const { proxyStatus } = require('../../../commands/proxy.js');

      proxyStatus();

      restoreConsoleLog(originalLog);

      const output = consoleLogOutput.join('\n');
      expect(output).toContain('状态: 关闭');
      expect(output).toContain('地址: http://saved.proxy.com:8891');
      expect(output).toContain('启动官方时清除: 否');
    });

    test('Claude 配置未配置代理时应显示未配置', () => {
      const { originalLog } = mockConsoleLog();

      const config = createDefaultConfig();
      config.proxy = {
        enabled: true,
        url: 'http://proxy.example.com:8080',
        clearForOfficial: false,
      };
      createCcRunConfig(config as Record<string, unknown>);

      // 不创建 Claude 配置或创建不含 proxy 的配置
      createClaudeSettings({});

      const { proxyStatus } = require('../../../commands/proxy.js');

      proxyStatus();

      restoreConsoleLog(originalLog);

      const output = consoleLogOutput.join('\n');
      expect(output).toContain('代理: 未配置');
    });

    test('RunCC 配置为空时应显示默认状态', () => {
      const { originalLog } = mockConsoleLog();

      // 创建空配置
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      const { proxyStatus } = require('../../../commands/proxy.js');

      proxyStatus();

      restoreConsoleLog(originalLog);

      const output = consoleLogOutput.join('\n');
      expect(output).toContain('RunCC 代理配置');
      expect(output).toContain('状态: 关闭');
    });
  });

  describe('proxyHelp - 显示帮助信息', () => {
    test('应显示完整的帮助信息', () => {
      const { originalLog } = mockConsoleLog();

      const { proxyHelp } = require('../../../commands/proxy.js');

      proxyHelp();

      restoreConsoleLog(originalLog);

      const output = consoleLogOutput.join('\n');

      // 验证包含所有命令
      expect(output).toContain('runcc proxy on');
      expect(output).toContain('runcc proxy off');
      expect(output).toContain('runcc proxy reset');
      expect(output).toContain('runcc proxy status');
      expect(output).toContain('runcc proxy help');

      // 验证包含说明
      expect(output).toContain('~/.claude/settings.json');
      expect(output).toContain('~/.runcc/config.json');
    });
  });

  describe('边界情况', () => {
    test('处理特殊格式的代理地址', async () => {
      const { originalLog } = mockConsoleLog();

      // 确保从空配置开始
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      // 测试 HTTPS 代理
      mockReadline(['https://secure.proxy.com:443']);

      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.url).toBe('https://secure.proxy.com:443');
    });

    test('处理带认证信息的代理地址', async () => {
      const { originalLog } = mockConsoleLog();

      // 确保从空配置开始
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      // 测试带用户名密码的代理
      mockReadline(['http://user:pass@proxy.example.com:8080']);

      const { proxyOn } = await requireProxyModule();

      await proxyOn();

      restoreConsoleLog(originalLog);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.url).toBe('http://user:pass@proxy.example.com:8080');
    });

    test('连续开关代理应正常工作', async () => {
      const { originalLog } = mockConsoleLog();

      // 确保从空配置开始
      const config = createDefaultConfig();
      createCcRunConfig(config as Record<string, unknown>);

      // 首次开启（需要输入）
      mockReadline(['http://proxy.example.com:8080']);

      const { proxyOn, proxyOff } = await requireProxyModule();

      await proxyOn();
      proxyOff();

      restoreConsoleLog(originalLog);

      // 验证开关都有输出
      expect(consoleLogOutput.length).toBeGreaterThan(0);

      const ccRunConfig = readCcRunConfig() as CcRunConfig;
      expect(ccRunConfig.proxy?.enabled).toBe(false);
    });
  });
});
