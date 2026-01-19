/**
 * 输出工具
 * 统一处理 UTF-8 输出，修复 Bun 编译二进制中文乱码问题
 */

/**
 * UTF-8 安全的日志输出
 * 使用 TextEncoder + process.stdout.write 确保中文正确显示
 */
export function safeLog(message: string): void {
  const encoder = new TextEncoder();
  process.stdout.write(encoder.encode(message + '\n'));
}

/**
 * UTF-8 安全的错误输出
 */
export function safeError(message: string): void {
  const encoder = new TextEncoder();
  process.stderr.write(encoder.encode(message + '\n'));
}
