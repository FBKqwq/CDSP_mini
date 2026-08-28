import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AppError } from '@/services/app-error'
import { useAuthStore } from '@/stores/auth'
import { llmChartApi } from '@/services/llm-chart-api'
import type { AuthSession } from '@/types/domain'

vi.mock('@/services/llm-chart-api', () => ({
  llmChartApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

const AUTH_KEY = 'tcm.auth-session'
const CONTEXT_KEY = 'tcm.context-ids'

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'token-abc',
    expiresAt: Date.now() + 60 * 60 * 1000,
    user: { id: 'user-1', displayName: '测试用户', role: 'patient' },
    ...overrides,
  }
}

describe('authStore 身份恢复（bootstrap）', () => {
  let storage: Map<string, unknown>

  beforeEach(() => {
    storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => {
        storage.set(key, value)
      },
      removeStorageSync: (key: string) => {
        storage.delete(key)
      },
    })
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('无本地缓存时清空会话且不请求 /me', async () => {
    const store = useAuthStore()
    await store.bootstrap()

    expect(store.session).toBeNull()
    expect(store.initialized).toBe(true)
    expect(store.isAuthenticated).toBe(false)
    expect(llmChartApi.me).not.toHaveBeenCalled()
  })

  it('本地令牌过期时清空会话且不请求 /me', async () => {
    storage.set(AUTH_KEY, makeSession({ expiresAt: Date.now() - 1000 }))
    const store = useAuthStore()
    await store.bootstrap()

    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(llmChartApi.me).not.toHaveBeenCalled()
  })

  it('/me 成功时用服务端返回的用户覆盖本地缓存并回写', async () => {
    storage.set(AUTH_KEY, makeSession())
    vi.mocked(llmChartApi.me).mockResolvedValue({
      id: 'user-1',
      displayName: '服务器用户',
      role: 'patient',
    })
    const store = useAuthStore()
    await store.bootstrap()

    expect(store.session?.user).toEqual({ id: 'user-1', displayName: '服务器用户', role: 'patient' })
    expect(store.isAuthenticated).toBe(true)
    const saved = storage.get(AUTH_KEY) as AuthSession
    expect(saved.user.displayName).toBe('服务器用户')
  })

  it('/me 失败（如 TOKEN_INVALID）时清空会话', async () => {
    storage.set(AUTH_KEY, makeSession())
    vi.mocked(llmChartApi.me).mockRejectedValue(new AppError('TOKEN_INVALID'))
    const store = useAuthStore()
    await store.bootstrap()

    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(storage.get(AUTH_KEY)).toBeUndefined()
  })

  it('登录成功写入会话并标记已认证', async () => {
    vi.mocked(llmChartApi.login).mockResolvedValue(makeSession())
    const store = useAuthStore()
    const ok = await store.login('patient', 'demo123')

    expect(ok).toBe(true)
    expect(store.session?.accessToken).toBe('token-abc')
    expect(store.isAuthenticated).toBe(true)
    expect(storage.get(AUTH_KEY)).toBeTruthy()
  })

  it('登录失败提示账号或密码错误', async () => {
    vi.mocked(llmChartApi.login).mockRejectedValue(new AppError('AUTH_INVALID'))
    const store = useAuthStore()
    const ok = await store.login('patient', 'wrong')

    expect(ok).toBe(false)
    expect(store.errorMessage).toBe('账号或密码错误')
    expect(store.session).toBeNull()
  })

  it('退出登录成功后清空会话和业务上下文缓存', async () => {
    storage.set(AUTH_KEY, makeSession())
    storage.set(CONTEXT_KEY, {
      patientId: 'patient-1',
      medicalHistoryId: 'history-1',
      expertId: 'expert-1',
    })
    vi.mocked(llmChartApi.me).mockResolvedValue({
      id: 'user-1',
      displayName: '测试用户',
      role: 'patient',
    })
    vi.mocked(llmChartApi.logout).mockResolvedValue(undefined)
    const store = useAuthStore()
    await store.bootstrap()
    const success = await store.logout()

    expect(success).toBe(true)
    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(storage.get(AUTH_KEY)).toBeUndefined()
    expect(storage.get(CONTEXT_KEY)).toBeUndefined()
  })

  it.each(['TOKEN_INVALID', 'TOKEN_EXPIRED'] as const)(
    '退出返回 %s 时按已经退出处理',
    async (code) => {
      storage.set(AUTH_KEY, makeSession())
      vi.mocked(llmChartApi.me).mockResolvedValue(makeSession().user)
      vi.mocked(llmChartApi.logout).mockRejectedValue(new AppError(code))
      const store = useAuthStore()
      await store.bootstrap()

      const success = await store.logout()

      expect(success).toBe(true)
      expect(store.session).toBeNull()
      expect(storage.get(AUTH_KEY)).toBeUndefined()
    },
  )

  it('网络或 5xx 失败时保留 Token 和当前登录状态', async () => {
    const cached = makeSession()
    storage.set(AUTH_KEY, cached)
    storage.set(CONTEXT_KEY, {
      patientId: 'patient-1',
      medicalHistoryId: 'history-1',
      expertId: 'expert-1',
    })
    vi.mocked(llmChartApi.me).mockResolvedValue(cached.user)
    vi.mocked(llmChartApi.logout).mockRejectedValue(
      new AppError('SERVICE_UNAVAILABLE', 'server error', 500),
    )
    const store = useAuthStore()
    await store.bootstrap()

    const success = await store.logout()

    expect(success).toBe(false)
    expect(store.session?.accessToken).toBe(cached.accessToken)
    expect(storage.get(AUTH_KEY)).toBeTruthy()
    expect(storage.get(CONTEXT_KEY)).toBeTruthy()
    expect(store.errorMessage).toBe('退出失败，请检查网络后重试')
  })

  it('连续提交退出请求时只调用一次接口', async () => {
    const cached = makeSession()
    storage.set(AUTH_KEY, cached)
    vi.mocked(llmChartApi.me).mockResolvedValue(cached.user)
    let resolveLogout: (() => void) | undefined
    vi.mocked(llmChartApi.logout).mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveLogout = resolve
      }),
    )
    const store = useAuthStore()
    await store.bootstrap()

    const first = store.logout()
    await Promise.resolve()
    const second = await store.logout()

    expect(second).toBe(false)
    expect(store.loggingOut).toBe(true)
    expect(llmChartApi.logout).toHaveBeenCalledTimes(1)
    resolveLogout?.()
    expect(await first).toBe(true)
    expect(store.loggingOut).toBe(false)
  })
})
