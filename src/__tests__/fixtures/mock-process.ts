/**
 * 进程启动 Mock 工具
 * 用于测试 launcher.ts 中的进程启动逻辑
 *
 * 核心机制：
 * 1. Mock spawn 函数，避免真实启动 claude 进程
 * 2. 记录 spawn 调用参数，验证环境变量构建逻辑
 * 3. 模拟进程退出，测试 waitForExit 功能
 */

import type { ChildProcess } from 'node:child_process';

/**
 * Spawn 调用记录
 */
export interface SpawnCall {
  /** 命令 */
  command: string;
  /** 参数数组 */
  args: string[];
  /** 选项 */
  options: {
    stdio?: unknown;
    env?: Record<string, string>;
  };
}

/**
 * Mock 进程上下文
 */
export interface MockProcessContext {
  /** spawn 调用记录 */
  calls: SpawnCall[];
  /** 原始 spawn 函数 */
  originalSpawn: typeof import('node:child_process').spawn;
  /** 下一次 spawn 返回的退出码 */
  nextExitCode: number;
  /** 下一次 spawn 是否应该抛出错误 */
  shouldThrow: boolean;
}

/** 当前激活的 Mock 进程上下文 */
let currentContext: MockProcessContext | null = null;

/**
 * 获取当前激活的上下文（用于测试环境初始化）
 * @internal
 */
export function getCurrentContext(): MockProcessContext | null {
  return currentContext;
}

/**
 * 创建 Mock 类子进程对象
 * @param exitCode 模拟的退出码
 */
function createMockChildProcess(exitCode: number): ChildProcess {
  const mockChild = {
    on(event: string, listener: (...args: unknown[]) => void) {
      // 模拟异步进程退出
      if (event === 'close') {
        setImmediate(() => {
          listener(exitCode, null);
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
  } as ChildProcess;

  return mockChild;
}

/**
 * 创建 Mock 进程环境
 *
 * 使用方式：
 * ```ts
 * import { beforeEach, afterEach, test, expect } from 'bun:test';
 * import { mockProcess, cleanupMockProcess, getSpawnCalls } from './fixtures/mock-process.js';
 * import { launchClaude } from '../utils/launcher.js';
 *
 * beforeEach(() => {
 *   mockProcess();
 * });
 *
 * afterEach(() => {
 *   cleanupMockProcess();
 * });
 *
 * test('应该使用正确的环境变量启动', () => {
 *   launchClaude({ endpoint: 'https://api.test.com', token: 'test-token' });
 *
 *   const calls = getSpawnCalls();
 *   expect(calls).toHaveLength(1);
 *   expect(calls[0].command).toBe('claude');
 *   expect(calls[0].env?.ANTHROPIC_BASE_URL).toBe('https://api.test.com');
 * });
 * ```
 */
export function mockProcess(): MockProcessContext {
  if (currentContext) {
    throw new Error('Mock process already active. Call cleanupMockProcess() first.');
  }

  // 动态导入避免循环依赖
  const childProcess = require('node:child_process');

  const calls: SpawnCall[] = [];
  const originalSpawn = childProcess.spawn;

  // Mock spawn 函数
  childProcess.spawn = function (
    command: string,
    args: string[],
    options: { stdio?: unknown; env?: Record<string, string> }
  ): ChildProcess {
    // 记录调用
    calls.push({
      command,
      args,
      options: {
        stdio: options?.stdio,
        env: { ...options.env }, // 复制环境变量避免后续修改
      },
    });

    if (currentContext!.shouldThrow) {
      throw new Error('Mock spawn error');
    }

    // 返回 Mock 子进程
    return createMockChildProcess(currentContext!.nextExitCode);
  };

  currentContext = {
    calls,
    originalSpawn,
    nextExitCode: 0,
    shouldThrow: false,
  };

  return currentContext;
}

/**
 * 清理 Mock 进程环境
 */
export function cleanupMockProcess(): void {
  if (!currentContext) {
    throw new Error('No mock process to cleanup.');
  }

  // 恢复原始 spawn 函数
  const childProcess = require('node:child_process');
  childProcess.spawn = currentContext.originalSpawn;

  currentContext = null;
}

/**
 * 获取所有 spawn 调用记录
 * @returns 调用记录数组
 */
export function getSpawnCalls(): SpawnCall[] {
  if (!currentContext) {
    throw new Error('Mock process not active. Call mockProcess() first.');
  }
  return currentContext.calls;
}

/**
 * 清空 spawn 调用记录
 */
export function clearSpawnCalls(): void {
  if (!currentContext) {
    throw new Error('Mock process not active. Call mockProcess() first.');
  }
  currentContext.calls = [];
}

/**
 * 设置下一次 spawn 的退出码
 * @param code 退出码
 */
export function setNextExitCode(code: number): void {
  if (!currentContext) {
    throw new Error('Mock process not active. Call mockProcess() first.');
  }
  currentContext.nextExitCode = code;
}

/**
 * 设置下一次 spawn 是否应该抛出错误
 * @param shouldThrow 是否抛出错误
 */
export function setSpawnShouldThrow(shouldThrow: boolean): void {
  if (!currentContext) {
    throw new Error('Mock process not active. Call mockProcess() first.');
  }
  currentContext.shouldThrow = shouldThrow;
}
