/**
 * Mock 进程工具验证测试
 * 确保 Mock 进程工具本身正常工作
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  mockProcess,
  cleanupMockProcess,
  getSpawnCalls,
  clearSpawnCalls,
  setNextExitCode,
  setSpawnShouldThrow,
} from './mock-process.js';

describe('Mock Process 工具验证', () => {
  beforeEach(() => {
    mockProcess();
  });

  afterEach(() => {
    cleanupMockProcess();
  });

  test('应该记录 spawn 调用', () => {
    const childProcess = require('node:child_process');

    childProcess.spawn('claude', ['--version'], {
      stdio: 'inherit',
      env: { TEST: 'value' },
    });

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('claude');
    expect(calls[0].args).toEqual(['--version']);
    expect(calls[0].options.env?.TEST).toBe('value');
  });

  test('应该记录多次 spawn 调用', () => {
    const childProcess = require('node:child_process');

    childProcess.spawn('claude', [], {});
    childProcess.spawn('npm', ['test'], {});

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0].command).toBe('claude');
    expect(calls[1].command).toBe('npm');
  });

  test('应该清空调用记录', () => {
    const childProcess = require('node:child_process');

    childProcess.spawn('test', [], {});
    clearSpawnCalls();

    const calls = getSpawnCalls();
    expect(calls).toHaveLength(0);
  });

  test('应该设置下一次 spawn 的退出码', async () => {
    const childProcess = require('node:child_process');

    setNextExitCode(42);
    const child = childProcess.spawn('test', [], {});

    // 模拟 waitForExit 逻辑
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code: number) => {
        resolve(code);
      });
    });

    expect(exitCode).toBe(42);
  });

  test('应该在 spawn 时抛出错误', () => {
    const childProcess = require('node:child_process');

    setSpawnShouldThrow(true);

    expect(() => {
      childProcess.spawn('test', [], {});
    }).toThrow('Mock spawn error');
  });
});
