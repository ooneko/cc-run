/**
 * 真实场景验证脚本
 * 测试 -- 参数透传功能
 */

import { extractPassthroughArgs, validateDashPosition } from '../src/utils/passthrough-args.js';

console.log('=== 参数透传功能验证 ===\n');

// 测试场景
const scenarios = [
  {
    name: '场景1: cc-run glm -- --dangerously-skip-permissions',
    argv: ['node', 'cc-run', 'glm', '--', '--dangerously-skip-permissions'],
    expected: ['--dangerously-skip-permissions'],
  },
  {
    name: '场景2: cc-run --claude -- --verbose',
    argv: ['node', 'cc-run', '--claude', '--', '--verbose'],
    expected: ['--verbose'],
  },
  {
    name: '场景3: cc-run deepseek -- --prompt "hello" --verbose',
    argv: ['node', 'cc-run', 'deepseek', '--', '--prompt', 'hello', '--verbose'],
    expected: ['--prompt', 'hello', '--verbose'],
  },
  {
    name: '场景4: cc-run glm (无透传参数)',
    argv: ['node', 'cc-run', 'glm'],
    expected: [],
  },
  {
    name: '场景5: 错误情况 - cc-run -- --verbose',
    argv: ['node', 'cc-run', '--', '--verbose'],
    shouldThrow: true,
  },
];

let passed = 0;
let failed = 0;

for (const scenario of scenarios) {
  console.log(`测试: ${scenario.name}`);
  console.log(`  argv: ${scenario.argv.slice(2).join(' ')}`);

  try {
    if (scenario.shouldThrow) {
      validateDashPosition(scenario.argv);
      console.log('  ❌ 失败: 预期抛出错误但没有');
      failed++;
    } else {
      validateDashPosition(scenario.argv);
      const result = extractPassthroughArgs(scenario.argv);
      const expected = scenario.expected ?? [];
      const success = JSON.stringify(result) === JSON.stringify(expected);
      if (success) {
        console.log(`  ✅ 通过: ${result.length > 0 ? result.join(' ') : '(无参数)'}`);
        passed++;
      } else {
        const expected = scenario.expected ?? [];
        console.log(`  ❌ 失败: 预期 [${expected.join(', ')}] 得到 [${result.join(', ')}]`);
        failed++;
      }
    }
  } catch (e) {
    if (scenario.shouldThrow) {
      console.log(`  ✅ 通过: 正确抛出错误 - ${(e as Error).message}`);
      passed++;
    } else {
      console.log(`  ❌ 失败: 意外错误 - ${(e as Error).message}`);
      failed++;
    }
  }
  console.log();
}

console.log('=== 验证结果 ===');
console.log(`✅ 通过: ${passed}/${scenarios.length}`);
console.log(`❌ 失败: ${failed}/${scenarios.length}`);

if (failed > 0) {
  process.exit(1);
}
