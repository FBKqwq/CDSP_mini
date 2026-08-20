import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from '@/services/app-error'

describe('api error mapping', () => {
  it('maps stable error codes to readable business messages', () => {
    expect(new AppError('TOKEN_EXPIRED').message).toBe('登录已过期，请重新登录')
    expect(new AppError('CONTEXT_INVALID').message).toContain('诊疗上下文')
  })

  it('preserves authoritative AppError details', () => {
    const original = new AppError('VALIDATION_ERROR', '姓名长度不正确', 400)
    expect(toAppError(original)).toBe(original)
    expect(original.status).toBe(400)
  })
})

