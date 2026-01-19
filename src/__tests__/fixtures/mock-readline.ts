/**
 * Readline Mock 工具
 * 用于测试需要用户输入的命令（token 提示、代理地址输入等）
 *
 * 核心机制：
 * 1. Mock createInterface，避免真实等待用户输入
 * 2. 预设用户输入答案，自动响应 question() 调用
 * 3. 支持多步骤输入序列
 *
 * 模块级 Mock：
 * - 调用 setupGlobalMock() 在测试文件顶部（在任何导入之前）设置全局 mock
 * - 使用 setAnswers() 和 getQuestions() 在测试中控制 mock 行为
 */

import type { Interface } from 'node:readline';

/**
 * 用户输入答案
 * - string: 单个字符串答案
 * - null: 空输入（用户直接回车）
 */
type InputAnswer = string | null;

/**
 * Mock readline 上下文
 */
export interface MockReadlineContext {
  /** 预设的答案队列 */
  answers: InputAnswer[];
  /** question 调用记录 */
  questions: string[];
  /** 原始 createInterface 函数 */
  originalCreateInterface: typeof import('node:readline').createInterface;
  /** 当前答案索引 */
  answerIndex: number;
}

/** 当前激活的 Mock readline 上下文 */
let currentContext: MockReadlineContext | null = null;

/** 全局共享的答案队列（用于模块级 mock） */
let globalAnswers: InputAnswer[] = [];
/** 全局共享的问题记录（用于模块级 mock） */
let globalQuestions: string[] = [];
/** 全局共享的问题索引（用于模块级 mock） */
let globalQuestionIndex = 0;
/** 原始 createInterface 函数（用于模块级 mock） */
let globalOriginalCreateInterface: typeof import('node:readline').createInterface | null = null;

/**
 * 设置模块级全局 readline mock
 * 必须在测试文件顶部、任何导入被测模块之前调用
 *
 * 使用方式：
 * ```ts
 * import { setupGlobalMock, setAnswers, getQuestions } from './fixtures/mock-readline.js';
 *
 * // ⚠️ 必须在任何导入之前调用
 * setupGlobalMock();
 *
 * import { myFunction } from '../my-module.js';
 *
 * test('测试', () => {
 *   setAnswers(['answer1', 'answer2']);
 *   // ... 调用使用 readline 的函数
 *   expect(getQuestions()).toHaveLength(2);
 * });
 * ```
 */
export function setupGlobalMock(): void {
  if (globalOriginalCreateInterface !== null) {
    // 已经设置过了，跳过
    return;
  }

  const readline = require('node:readline');
  globalOriginalCreateInterface = readline.createInterface;

  readline.createInterface = function (): Interface {
    const mockInterface = {
      question(query: string, callback: (answer: string) => void): Interface {
        // 记录问题
        globalQuestions.push(query);

        // 获取当前答案（使用全局索引）
        const currentAnswer = globalAnswers[globalQuestionIndex];

        // 处理不同类型的答案
        let answer: string;
        if (currentAnswer === null || currentAnswer === undefined) {
          // null 或 undefined 类型：返回空字符串
          answer = '';
        } else {
          // 字符串类型：直接使用
          answer = currentAnswer;
        }

        globalQuestionIndex++;

        // 异步调用回调，模拟真实 readline 行为
        setImmediate(() => {
          callback(answer);
        });

        return mockInterface;
      },
      close(): void {
        // 空实现
      },
      terminal: false,
      line: '',
      cursor: 0,
      getPrompt(): string {
        return '';
      },
      setPrompt(): void {},
      prompt(): void {},
      pause(): Interface {
        return mockInterface;
      },
      resume(): Interface {
        return mockInterface;
      },
      write(): Interface {
        return mockInterface;
      },
      getCursorPos(): { cols: number; rows: number } {
        return { cols: 0, rows: 0 };
      },
    } as unknown as Interface;

    return mockInterface;
  };
}

/**
 * 设置全局 mock 的答案队列
 * @param answers 预设答案数组
 */
export function setAnswers(answers: InputAnswer[]): void {
  globalAnswers = answers;
  globalQuestions = [];
  globalQuestionIndex = 0;
}

/**
 * 获取全局 mock 记录的所有问题
 * @returns 问题数组
 */
export function getGlobalQuestions(): string[] {
  return globalQuestions;
}

/**
 * 清空全局 mock 的状态
 */
export function clearGlobalState(): void {
  globalAnswers = [];
  globalQuestions = [];
  globalQuestionIndex = 0;
}

/**
 * 创建 Mock readline 接口
 * @param answers 预设答案数组
 */
function createMockInterface(answers: InputAnswer[]): Interface {
  let questionIndex = 0;

  const mockInterface = {
    question(query: string, callback: (answer: string) => void): Interface {
      // 记录问题
      if (currentContext) {
        currentContext.questions.push(query);
      }

      // 获取当前答案
      const currentAnswer = answers[questionIndex];

      // 处理不同类型的答案
      let answer: string;
      if (currentAnswer === null || currentAnswer === undefined) {
        // null 或 undefined 类型：返回空字符串（模拟用户直接回车或无预设答案）
        answer = '';
      } else {
        // 字符串类型：直接使用
        answer = currentAnswer;
      }

      questionIndex++;

      // 异步调用回调，模拟真实 readline 行为
      setImmediate(() => {
        callback(answer);
      });

      return mockInterface;
    },
    close(): void {
      // 空实现，用于测试清理
    },
    terminal: false,
    line: '',
    cursor: 0,
    getPrompt(): string {
      return '';
    },
    setPrompt(): void {},
    prompt(): void {},
    pause(): Interface {
      return mockInterface;
    },
    resume(): Interface {
      return mockInterface;
    },
    write(): Interface {
      return mockInterface;
    },
    getCursorPos(): { cols: number; rows: number } {
      return { cols: 0, rows: 0 };
    },
  } as unknown as Interface;

  return mockInterface;
}

/**
 * 创建 Mock readline 环境
 *
 * 使用方式：
 * ```ts
 * import { beforeEach, afterEach, test, expect } from 'bun:test';
 * import { mockReadline, cleanupMockReadline, getQuestions } from './fixtures/mock-readline.js';
 * import { promptForToken } from '../commands/run.js';
 *
 * beforeEach(() => {
 *   mockReadline(['my-secret-token']);
 * });
 *
 * afterEach(() => {
 *   cleanupMockReadline();
 * });
 *
 * test('应该提示用户输入 token', async () => {
 *   const token = await promptForToken('glm');
 *   expect(token).toBe('my-secret-token');
 *
 *   const questions = getQuestions();
 *   expect(questions[0]).toContain('请输入');
 * });
 * ```
 *
 * 支持多步骤输入：
 * ```ts
 * beforeEach(() => {
 *   // 预设多个答案，按顺序消费
 *   mockReadline(['first-answer', 'second-answer', 'third-answer']);
 * });
 * ```
 *
 * 支持空输入（模拟用户直接回车）：
 * ```ts
 * beforeEach(() => {
 *   // null 表示用户直接回车，返回空字符串
 *   mockReadline([null, 'actual-answer']);
 * });
 * ```
 */
export function mockReadline(answers: InputAnswer[]): MockReadlineContext {
  if (currentContext) {
    throw new Error('Mock readline already active. Call cleanupMockReadline() first.');
  }

  // 动态导入避免循环依赖
  const readline = require('node:readline');

  const questions: string[] = [];
  const originalCreateInterface = readline.createInterface;

  // Mock createInterface 函数
  readline.createInterface = function (): Interface {
    return createMockInterface(answers);
  };

  currentContext = {
    answers,
    questions,
    originalCreateInterface,
    answerIndex: 0,
  };

  return currentContext;
}

/**
 * 清理 Mock readline 环境
 */
export function cleanupMockReadline(): void {
  if (!currentContext) {
    throw new Error('No mock readline to cleanup.');
  }

  // 恢复原始 createInterface 函数
  const readline = require('node:readline');
  readline.createInterface = currentContext.originalCreateInterface;

  currentContext = null;
}

/**
 * 获取所有 question 调用记录
 * @returns 问题数组
 */
export function getQuestions(): string[] {
  if (!currentContext) {
    throw new Error('Mock readline not active. Call mockReadline() first.');
  }
  return currentContext.questions;
}

/**
 * 清空调用记录
 * 如果没有激活的 mock，静默返回（用于 afterEach 清理）
 */
export function clearQuestions(): void {
  if (!currentContext) {
    return;
  }
  currentContext.questions = [];
}

/**
 * 获取当前答案索引
 * @returns 索引值
 */
export function getAnswerIndex(): number {
  if (!currentContext) {
    throw new Error('Mock readline not active. Call mockReadline() first.');
  }
  return currentContext.answerIndex;
}
