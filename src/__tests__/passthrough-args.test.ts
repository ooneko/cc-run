/**
 * 参数透传功能测试
 * 测试 -- 分隔符后的参数提取和验证
 */

import { describe, test, expect } from 'bun:test';
import { extractPassthroughArgs, validateDashPosition } from '../utils/passthrough-args.js';

describe('参数透传功能', () => {
  describe('extractPassthroughArgs', () => {
    test('无 -- 时返回空数组', () => {
      const argv = ['node', 'script.js', 'glm'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual([]);
    });

    test('提取 -- 之后的参数', () => {
      const argv = ['node', 'script.js', 'glm', '--', '--verbose', '--dangerously-skip-permissions'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual(['--verbose', '--dangerously-skip-permissions']);
    });

    test('-- 之后无参数时返回空数组', () => {
      const argv = ['node', 'script.js', 'glm', '--'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual([]);
    });

    test('-- 在中间时正确提取', () => {
      const argv = ['node', 'script.js', 'glm', '--', '--prompt', 'hello', '--verbose'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual(['--prompt', 'hello', '--verbose']);
    });

    test('-- 作为第一个参数时正确提取参数', () => {
      const argv = ['node', 'script.js', '--', '--help', '--version'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual(['--help', '--version']);
    });

    test('-- 作为第一个参数且只有单个参数', () => {
      const argv = ['node', 'script.js', '--', '--dangerously-skip-permissions'];
      const result = extractPassthroughArgs(argv);
      expect(result).toEqual(['--dangerously-skip-permissions']);
    });
  });

  describe('validateDashPosition', () => {
    test('无 -- 时不抛出错误', () => {
      const argv = ['node', 'script.js', 'glm'];
      expect(() => validateDashPosition(argv)).not.toThrow();
    });

    test('-- 在 provider 时不抛出错误', () => {
      const argv = ['node', 'script.js', 'glm', '--', '--verbose'];
      expect(() => validateDashPosition(argv)).not.toThrow();
    });

    test('-- 在 --claude 之后不抛出错误', () => {
      const argv = ['node', 'script.js', '--claude', '--', '--verbose'];
      expect(() => validateDashPosition(argv)).not.toThrow();
    });

    test('-- 作为第一个参数时允许通过（官方模式 + 参数传递）', () => {
      const argv = ['node', 'script.js', '--', '--verbose'];
      expect(() => validateDashPosition(argv)).not.toThrow();
    });

    test('-- 作为第一个参数且有多个参数时允许通过', () => {
      const argv = ['node', 'script.js', '--', '--dangerously-skip-permissions', '--verbose'];
      expect(() => validateDashPosition(argv)).not.toThrow();
    });

    test('-- 在其他选项之前时抛出错误', () => {
      const argv = ['node', 'script.js', '--unknown', '--', '--verbose'];
      expect(() => validateDashPosition(argv)).toThrow('必须在 provider 名称或 --claude 选项之后');
    });
  });
});
