/**
 * 测试环境初始化模块
 *
 * 核心问题：在 Node.js/Bun 中，spawn 和 createInterface 在模块加载时就被引用，
 * 在 beforeEach 中设置 mock 无法生效。
 *
 * 解决方案：在测试文件加载前（模块顶层）预先设置 mock，
 * 确保被测模块导入时使用的是 mock 版本。
 *
 * 使用方式：
 * ```ts
 * // 在测试文件最顶部导入
 * import '../../helpers/setup-test-env.js';
 *
 * import { beforeEach, afterEach, test, expect } from 'bun:test';
 * import { clearSpawnCalls, setNextExitCode } from '../fixtures/mock-process.js';
 *
 * describe('My test', () => {
 *   beforeEach(() => {
 *     clearSpawnCalls();
 *     setNextExitCode(0);
 *   });
 * });
 * ```
 */

// 导入并激活 mock（必须在导入被测模块之前执行）
import { mockProcess } from '../fixtures/mock-process.js';

// 激活全局 mock 进程环境
// 注意：这里的 mock 会一直存在，测试通过 clearSpawnCalls() 清空调用记录
mockProcess();

// 导入 readline mock（但不激活，需要时手动调用）
export { mockReadline, cleanupMockReadline } from '../fixtures/mock-readline.js';
