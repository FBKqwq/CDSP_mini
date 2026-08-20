import { appEnv, assertRemoteEnv } from '@/config/env'
import { AppError, type AppErrorCode } from '@/services/app-error'
import { loadAuthSession } from '@/services/storage'
import type { ApiEnvelope } from '@/types/api'

export interface RequestOptions {
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  query?: Record<string, string | number | boolean | undefined>
  timeout?: number
  authenticated?: boolean
}

function queryString(query: RequestOptions['query']): string {
  if (!query) return ''
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.success === 'boolean' &&
    typeof record.code === 'string' &&
    typeof record.message === 'string' &&
    'data' in record
  )
}

export function request<T>(options: RequestOptions): Promise<T> {
  assertRemoteEnv()
  const session = loadAuthSession()
  const authenticated = options.authenticated !== false
  const header: Record<string, string> = { 'content-type': 'application/json' }
  if (authenticated && session?.accessToken) {
    header.Authorization = `Bearer ${session.accessToken}`
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${appEnv.apiBaseUrl}${options.path}${queryString(options.query)}`,
      method: options.method ?? 'GET',
      data: options.data as UniApp.RequestOptions['data'],
      timeout: options.timeout ?? 15_000,
      header,
      success(response) {
        const payload = response.data
        if (!isEnvelope<T>(payload)) {
          reject(new AppError('SERVICE_UNAVAILABLE', '服务响应格式不符合约定', response.statusCode))
          return
        }
        if (!payload.success) {
          const code = payload.code as AppErrorCode
          const error = new AppError(code || 'UNKNOWN', payload.message, response.statusCode)
          if (error.code === 'TOKEN_EXPIRED') uni.$emit('auth:expired')
          reject(error)
          return
        }
        resolve(payload.data)
      },
      fail(error) {
        reject(new AppError('SERVICE_UNAVAILABLE', error.errMsg))
      },
    })
  })
}

