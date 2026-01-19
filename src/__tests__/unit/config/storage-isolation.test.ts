/**
 * Mock 隔离验证测试
 * 用于调试 beforeEach/afterEach 是否正确隔离
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createMockFs, cleanupMockFs, hasCcRunConfig } from '../../fixtures/mock-fs.js';

describe('Mock 隔离测试', () => {
  let mockFs: ReturnType<typeof createMockFs>;

  beforeEach(() => {
    mockFs = createMockFs();
  });

  afterEach(() => {
    cleanupMockFs(mockFs);
  });

  test('第一个测试 - 没有配置文件', () => {
    const hasConfig = hasCcRunConfig();
    console.log('Test 1 - hasCcRunConfig:', hasConfig);
    expect(hasConfig).toBe(false);
  });

  test('第二个测试 - 仍然没有配置文件', () => {
    const hasConfig = hasCcRunConfig();
    console.log('Test 2 - hasCcRunConfig:', hasConfig);
    expect(hasConfig).toBe(false);
  });
});
