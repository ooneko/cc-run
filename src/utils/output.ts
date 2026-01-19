/**
 * 输出工具
 * 统一处理 UTF-8 输出，修复 Bun 编译二进制中文乱码问题
 */

/**
 * UTF-8 安全的日志输出
 * 使用 TextEncoder + Bun.write 确保中文正确显示
 */
export function safeLog(message: string): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(message + '\n');
  Bun.write(Bun.stdout, data);
}

/**
 * UTF-8 安全的错误输出
 */
export function safeError(message: string): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(message + '\n');
  Bun.write(Bun.stderr, data);
}

/**
 * 标准 console.log 包装器
 * 在 Bun 编译环境下回退到 safeLog
 */
export function log(message: string): void {
  // 检测是否在 Bun 编译环境中
  if (process?.env?.BUN_COMPILER === '1' || !process?.stdout?.isTTY) {
    safeLog(message);
  } else {
    console.log(message);
  }
}

/**
 * 标准 console.error 包装器
 */
export function error(message: string): void {
  if (process?.env?.BUN_COMPILER === '1' || !process?.stdout?.isTTY) {
    safeError(message);
  } else {
    console.error(message);
  }
}
