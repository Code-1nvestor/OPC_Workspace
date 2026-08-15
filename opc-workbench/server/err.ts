/**
 * 错误信息安全提取
 *
 * catch 子句的 error 在 TS 中类型为 unknown，直接用 error.message 会报错。
 * 统一走此工具，替代各处 `catch (error: any) { error?.message }` 的写法。
 */
export function errMsg(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
