/**
 * Mock readline 工具验证测试
 * 确保 Mock readline 工具本身正常工作
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  mockReadline,
  cleanupMockReadline,
  getQuestions,
  clearQuestions,
} from './mock-readline.js';

describe('Mock Readline 工具验证', () => {
  beforeEach(() => {
    mockReadline(['test-answer']);
  });

  afterEach(() => {
    cleanupMockReadline();
  });

  test('应该预设用户输入答案', async () => {
    const readline = require('node:readline');
    const rl = readline.createInterface();

    const answer = await new Promise<string>((resolve) => {
      rl.question('请输入: ', resolve);
    });

    expect(answer).toBe('test-answer');
  });

  test('应该记录问题', async () => {
    const readline = require('node:readline');
    const rl = readline.createInterface();

    await new Promise<string>((resolve) => {
      rl.question('请输入 token: ', resolve);
    });

    const questions = getQuestions();
    expect(questions).toHaveLength(1);
    expect(questions[0]).toBe('请输入 token: ');
  });

  test('应该支持多步骤输入', async () => {
    cleanupMockReadline();
    mockReadline(['answer1', 'answer2', 'answer3']);

    const readline = require('node:readline');
    const rl = readline.createInterface();

    const answers: string[] = [];

    for (const question of ['Q1: ', 'Q2: ', 'Q3: ']) {
      await new Promise<string>((resolve) => {
        rl.question(question, (answer: string) => {
          answers.push(answer);
          resolve(answer);
        });
      });
    }

    expect(answers).toEqual(['answer1', 'answer2', 'answer3']);
    expect(getQuestions()).toEqual(['Q1: ', 'Q2: ', 'Q3: ']);
  });

  test('应该清空调用记录', async () => {
    const readline = require('node:readline');
    const rl = readline.createInterface();

    await new Promise<string>((resolve) => {
      rl.question('test: ', resolve);
    });

    clearQuestions();
    expect(getQuestions()).toHaveLength(0);
  });

  test('应该支持 null 输入（模拟用户直接回车）', async () => {
    cleanupMockReadline();
    mockReadline([null]);

    const readline = require('node:readline');
    const rl = readline.createInterface();

    const answer = await new Promise<string>((resolve) => {
      rl.question('按回车继续: ', resolve);
    });

    expect(answer).toBe('');
  });
});
