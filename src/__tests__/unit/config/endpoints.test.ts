/**
 * endpoints.ts 单元测试
 * 测试内置 endpoints 配置
 */

import { describe, test, expect } from 'bun:test';
import {
  BUILTIN_ENDPOINTS,
  getBuiltinEndpoint,
  isBuiltinEndpoint,
  getBuiltinEndpointNames,
} from '../../../config/endpoints.js';

describe('endpoints.ts - 内置 Endpoints 配置', () => {
  // ========================================================================
  // BUILTIN_ENDPOINTS 常量测试
  // ========================================================================

  describe('BUILTIN_ENDPOINTS', () => {
    test('应包含所有预定义的 endpoints', () => {
      expect(BUILTIN_ENDPOINTS).toHaveLength(3);
    });

    test('每个 endpoint 应该有必需的字段', () => {
      BUILTIN_ENDPOINTS.forEach((endpoint) => {
        expect(endpoint.name).toBeDefined();
        expect(endpoint.endpoint).toBeDefined();
        expect(endpoint.models).toBeDefined();
      });
    });

    test('每个 endpoint 应该有完整的模型映射', () => {
      BUILTIN_ENDPOINTS.forEach((ep) => {
        expect(ep.models?.haiku).toBeDefined();
        expect(ep.models?.opus).toBeDefined();
        expect(ep.models?.sonnet).toBeDefined();
      });
    });

    test('endpoint URL 应该是有效的 HTTPS 地址', () => {
      BUILTIN_ENDPOINTS.forEach((ep) => {
        expect(ep.endpoint).toMatch(/^https:\/\//);
      });
    });

    test('GLM endpoint 配置应该正确', () => {
      const glm = BUILTIN_ENDPOINTS.find((ep) => ep.name === 'glm');

      expect(glm).toBeDefined();
      expect(glm?.endpoint).toBe('https://open.bigmodel.cn/api/anthropic');
      expect(glm?.models?.haiku).toBe('glm-4.7');
      expect(glm?.models?.opus).toBe('glm-4.7');
      expect(glm?.models?.sonnet).toBe('glm-4.7');
    });

    test('DeepSeek endpoint 配置应该正确', () => {
      const deepseek = BUILTIN_ENDPOINTS.find((ep) => ep.name === 'deepseek');

      expect(deepseek).toBeDefined();
      expect(deepseek?.endpoint).toBe('https://api.deepseek.com/anthropic');
      expect(deepseek?.models?.haiku).toBe('deepseek-chat');
      expect(deepseek?.models?.opus).toBe('deepseek-chat');
      expect(deepseek?.models?.sonnet).toBe('deepseek-chat');
    });

    test('MiniMax endpoint 配置应该正确', () => {
      const minimax = BUILTIN_ENDPOINTS.find((ep) => ep.name === 'minimax');

      expect(minimax).toBeDefined();
      expect(minimax?.endpoint).toBe('https://api.minimax.io/anthropic');
      expect(minimax?.models?.haiku).toBe('MiniMax-M2');
      expect(minimax?.models?.opus).toBe('MiniMax-M2');
      expect(minimax?.models?.sonnet).toBe('MiniMax-M2');
    });
  });

  // ========================================================================
  // getBuiltinEndpoint() 测试
  // ========================================================================

  describe('getBuiltinEndpoint()', () => {
    test('应返回 GLM endpoint', () => {
      const endpoint = getBuiltinEndpoint('glm');

      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe('glm');
      expect(endpoint?.endpoint).toBe('https://open.bigmodel.cn/api/anthropic');
    });

    test('应返回 DeepSeek endpoint', () => {
      const endpoint = getBuiltinEndpoint('deepseek');

      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe('deepseek');
      expect(endpoint?.endpoint).toBe('https://api.deepseek.com/anthropic');
    });

    test('应返回 MiniMax endpoint', () => {
      const endpoint = getBuiltinEndpoint('minimax');

      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe('minimax');
      expect(endpoint?.endpoint).toBe('https://api.minimax.io/anthropic');
    });

    test('当 endpoint 不存在时，应返回 undefined', () => {
      const endpoint = getBuiltinEndpoint('non-existent');

      expect(endpoint).toBeUndefined();
    });

    test('应返回完整的 endpoint 配置（包括模型映射）', () => {
      const endpoint = getBuiltinEndpoint('glm');

      expect(endpoint?.models).toEqual({
        haiku: 'glm-4.7',
        opus: 'glm-4.7',
        sonnet: 'glm-4.7',
      });
    });

    test('大小写敏感', () => {
      const lower = getBuiltinEndpoint('glm');
      const upper = getBuiltinEndpoint('GLM');
      const mixed = getBuiltinEndpoint('Glm');

      expect(lower).toBeDefined();
      expect(upper).toBeUndefined();
      expect(mixed).toBeUndefined();
    });
  });

  // ========================================================================
  // isBuiltinEndpoint() 测试
  // ========================================================================

  describe('isBuiltinEndpoint()', () => {
    test('应识别 GLM 为内置 endpoint', () => {
      expect(isBuiltinEndpoint('glm')).toBe(true);
    });

    test('应识别 DeepSeek 为内置 endpoint', () => {
      expect(isBuiltinEndpoint('deepseek')).toBe(true);
    });

    test('应识别 MiniMax 为内置 endpoint', () => {
      expect(isBuiltinEndpoint('minimax')).toBe(true);
    });

    test('非内置 endpoint 应返回 false', () => {
      expect(isBuiltinEndpoint('custom')).toBe(false);
      expect(isBuiltinEndpoint('openai')).toBe(false);
      expect(isBuiltinEndpoint('')).toBe(false);
    });

    test('大小写敏感', () => {
      expect(isBuiltinEndpoint('glm')).toBe(true);
      expect(isBuiltinEndpoint('GLM')).toBe(false);
      expect(isBuiltinEndpoint('Glm')).toBe(false);
    });
  });

  // ========================================================================
  // getBuiltinEndpointNames() 测试
  // ========================================================================

  describe('getBuiltinEndpointNames()', () => {
    test('应返回所有内置 endpoint 名称', () => {
      const names = getBuiltinEndpointNames();

      expect(names).toEqual(['glm', 'deepseek', 'minimax']);
    });

    test('应返回字符串数组', () => {
      const names = getBuiltinEndpointNames();

      expect(Array.isArray(names)).toBe(true);
      names.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    test('返回的名称数量应该与 BUILTIN_ENDPOINTS 一致', () => {
      const names = getBuiltinEndpointNames();

      expect(names).toHaveLength(BUILTIN_ENDPOINTS.length);
    });

    test('返回的所有名称都应该是有效的 endpoint', () => {
      const names = getBuiltinEndpointNames();

      names.forEach((name) => {
        expect(isBuiltinEndpoint(name)).toBe(true);
      });
    });

    test('每次调用应返回新数组', () => {
      const names1 = getBuiltinEndpointNames();
      const names2 = getBuiltinEndpointNames();

      expect(names1).not.toBe(names2);
      expect(names1).toEqual(names2);
    });
  });

  // ========================================================================
  // 数据一致性测试
  // ========================================================================

  describe('数据一致性', () => {
    test('所有内置 endpoint 名称应该唯一', () => {
      const names = getBuiltinEndpointNames();
      const uniqueNames = new Set(names);

      expect(names).toHaveLength(uniqueNames.size);
    });

    test('endpoint 名称不应该包含空格或特殊字符', () => {
      const names = getBuiltinEndpointNames();

      names.forEach((name) => {
        expect(name).toMatch(/^[a-z0-9-]+$/);
      });
    });

    test('所有 endpoint URL 应该使用 https 协议', () => {
      BUILTIN_ENDPOINTS.forEach((ep) => {
        expect(ep.endpoint).toMatch(/^https:\/\//);
      });
    });

    test('所有 endpoint 应该有相同模型映射结构', () => {
      const modelKeys = BUILTIN_ENDPOINTS.map((ep) =>
        ep.models ? Object.keys(ep.models).sort() : []
      );

      const firstKeys = modelKeys[0];
      modelKeys.forEach((keys) => {
        expect(keys).toEqual(firstKeys);
      });
    });
  });
});
