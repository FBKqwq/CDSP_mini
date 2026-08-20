export type AppErrorCode =
  | 'AUTH_INVALID'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'CONTEXT_INVALID'
  | 'INSTANCE_INVALID'
  | 'STREAM_INTERRUPTED'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

const fallbackMessages: Record<AppErrorCode, string> = {
  AUTH_INVALID: '账号或密码错误',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  FORBIDDEN: '当前账号无权访问该资源',
  CONTEXT_INVALID: '诊疗上下文无效，请重新选择',
  INSTANCE_INVALID: 'AI 会话已失效，请重新开始',
  STREAM_INTERRUPTED: '连接已中断，可尝试恢复',
  SERVICE_UNAVAILABLE: '服务暂不可用，请稍后重试',
  VALIDATION_ERROR: '提交内容不符合要求',
  UNKNOWN: '请求失败，请稍后重试',
}

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
    public readonly status?: number,
  ) {
    super(message || fallbackMessages[code])
    this.name = 'AppError'
  }
}

export function toAppError(value: unknown, fallback: AppErrorCode = 'UNKNOWN'): AppError {
  if (value instanceof AppError) return value
  if (value instanceof Error) return new AppError(fallback, value.message)
  return new AppError(fallback)
}

