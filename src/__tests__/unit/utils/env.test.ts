/**
 * env.ts 单元测试
 * 测试环境变量构建逻辑
 */

import { describe, test, expect } from 'bun:test';
import { buildEnv, buildOfficialEnv } from '../../../utils/env.js';
import type { LaunchOptions } from '../../../config/types.js';

describe('env.ts - 环境变量构建', () => {
  // ========================================================================
  // buildEnv() 测试
  // ========================================================================

  describe('buildEnv()', () => {
    test('应构建基本的 ANTHROPIC 环境变量', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
      };

      const env = buildEnv(options);

      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');
    });

    test('应设置模型映射环境变量', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
        models: {
          haiku: 'custom-haiku',
          opus: 'custom-opus',
          sonnet: 'custom-sonnet',
        },
      };

      const env = buildEnv(options);

      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('custom-haiku');
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('custom-opus');
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('custom-sonnet');
    });

    test('应只设置提供的模型映射', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
        models: {
          haiku: 'custom-haiku',
        },
      };

      const env = buildEnv(options);

      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('custom-haiku');
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
    });

    test('当没有模型映射时，不应设置模型环境变量', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
      };

      const env = buildEnv(options);

      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
    });

    test('应设置代理环境变量（所有变体）', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
        proxyUrl: 'http://proxy.com:8080',
      };

      const env = buildEnv(options);

      expect(env.http_proxy).toBe('http://proxy.com:8080');
      expect(env.https_proxy).toBe('http://proxy.com:8080');
      expect(env.HTTP_PROXY).toBe('http://proxy.com:8080');
      expect(env.HTTPS_PROXY).toBe('http://proxy.com:8080');
    });

    test('当没有代理时，不应设置代理环境变量', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
      };

      const env = buildEnv(options);

      expect(env.http_proxy).toBeUndefined();
      expect(env.https_proxy).toBeUndefined();
      expect(env.HTTP_PROXY).toBeUndefined();
      expect(env.HTTPS_PROXY).toBeUndefined();
    });

    test('应同时设置 API、模型和代理环境变量', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
        models: {
          haiku: 'custom-haiku',
        },
        proxyUrl: 'http://proxy.com:8080',
      };

      const env = buildEnv(options);

      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('custom-haiku');
      expect(env.http_proxy).toBe('http://proxy.com:8080');
      expect(env.https_proxy).toBe('http://proxy.com:8080');
    });
  });

  // ========================================================================
  // buildOfficialEnv() 测试
  // ========================================================================

  describe('buildOfficialEnv()', () => {
    test('当没有代理时，应返回空对象', () => {
      const env = buildOfficialEnv();

      expect(env).toEqual({});
    });

    test('应设置代理环境变量（所有变体）', () => {
      const env = buildOfficialEnv('http://proxy.com:8080');

      expect(env.http_proxy).toBe('http://proxy.com:8080');
      expect(env.https_proxy).toBe('http://proxy.com:8080');
      expect(env.HTTP_PROXY).toBe('http://proxy.com:8080');
      expect(env.HTTPS_PROXY).toBe('http://proxy.com:8080');
    });

    test('不应设置 ANTHROPIC 环境变量', () => {
      const env = buildOfficialEnv('http://proxy.com:8080');

      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
    });

    test('应正确处理不同的代理 URL 格式', () => {
      const testCases = [
        'http://proxy.com:8080',
        'https://proxy.com:443',
        'http://user:pass@proxy.com:8080',
        'socks5://proxy.com:1080',
      ];

      testCases.forEach((proxyUrl) => {
        const env = buildOfficialEnv(proxyUrl);

        expect(env.http_proxy).toBe(proxyUrl);
        expect(env.https_proxy).toBe(proxyUrl);
        expect(env.HTTP_PROXY).toBe(proxyUrl);
        expect(env.HTTPS_PROXY).toBe(proxyUrl);
      });
    });
  });

  // ========================================================================
  // 环境变量隔离性测试
  // ========================================================================

  describe('环境变量隔离性', () => {
    test('buildEnv() 不应修改输入对象', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
        models: {
          haiku: 'custom-haiku',
        },
      };

      const originalOptions = JSON.parse(JSON.stringify(options));
      buildEnv(options);

      expect(options).toEqual(originalOptions);
    });

    test('buildEnv() 每次调用应返回新对象', () => {
      const options: LaunchOptions = {
        apiEndpoint: 'https://api.example.com',
        apiKey: 'sk-test-key',
      };

      const env1 = buildEnv(options);
      const env2 = buildEnv(options);

      expect(env1).not.toBe(env2);
      expect(env1).toEqual(env2);
    });

    test('buildOfficialEnv() 每次调用应返回新对象', () => {
      const env1 = buildOfficialEnv('http://proxy.com');
      const env2 = buildOfficialEnv('http://proxy.com');

      expect(env1).not.toBe(env2);
      expect(env1).toEqual(env2);
    });
  });
});
