import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { llmChartApi } from '@/services/llm-chart-api'
import { toAppError } from '@/services/app-error'

import {
  clearAuthSession,
  clearBusinessStorage,
  loadAuthSession,
  saveAuthSession,
} from '@/services/storage'

import type { AuthSession } from '@/types/domain'


export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(null)
  const initialized = ref(false)
  const submitting = ref(false)
  const errorMessage = ref('')


  /*
   * 是否登录只看当前 Pinia 中是否存在有效 session。
   *
   * Token 是否过期、是否吊销，由后端 /auth/me 判断，
   * 不在前端自行解析 expiresAt 决定。
   */
  const isAuthenticated = computed(() => {
    return Boolean(
        session.value?.accessToken,
    )
  })


  async function bootstrap(): Promise<void> {
    if (initialized.value) {
      return
    }

    errorMessage.value = ''

    const cached = loadAuthSession()

    if (!cached) {
      session.value = null
      initialized.value = true
      return
    }

    /*
     * 先恢复 Token，让下面的 /auth/me 请求能够自动携带
     * Authorization: Bearer <token>
     */
    session.value = cached

    try {
      /*
       * 服务端是登录状态的唯一可信来源。
       *
       * 服务端会检查：
       * - auth_session 是否存在
       * - Token 是否被吊销
       * - Token 是否过期
       * - 用户是否仍然存在
       * - 用户是否 enabled
       */
      const user = await llmChartApi.me()

      const restoredSession: AuthSession = {
        ...cached,
        user,
      }

      session.value = restoredSession

      saveAuthSession(
          restoredSession,
      )
    } catch (error) {
      const appError = toAppError(error)

      expire()

      /*
       * bootstrap 失败不需要在登录页保留服务错误。
       * 用户重新登录即可。
       */
      if (
          appError.code !== 'TOKEN_INVALID' &&
          appError.code !== 'TOKEN_EXPIRED'
      ) {
        errorMessage.value = appError.message
      }
    } finally {
      initialized.value = true
    }
  }


  async function login(
      username: string,
      password: string,
  ): Promise<boolean> {
    const normalizedUsername = username.trim()

    if (!normalizedUsername || !password) {
      errorMessage.value = '请输入账号和密码'
      return false
    }

    if (submitting.value) {
      return false
    }

    submitting.value = true
    errorMessage.value = ''

    try {
      const authSession =
          await llmChartApi.login({
            username: normalizedUsername,
            password,
          })

      /*
       * POST /auth/login 返回 200 后直接保存服务端 Session。
       *
       * 不在这里自行判断 expiresAt。
       * 服务端 auth_session 才是会话状态的权威来源。
       */
      session.value = authSession

      saveAuthSession(
          authSession,
      )

      initialized.value = true

      return true
    } catch (error) {
      session.value = null

      errorMessage.value = toAppError(
          error,
          'AUTH_INVALID',
      ).message

      return false
    } finally {
      submitting.value = false
    }
  }


  async function logout(): Promise<void> {
    try {
      if (session.value) {
        await llmChartApi.logout()
      }
    } finally {
      expire()
    }
  }


  function expire(): void {
    session.value = null

    clearAuthSession()
    clearBusinessStorage()
  }


  return {
    session,
    initialized,
    submitting,
    errorMessage,
    isAuthenticated,

    bootstrap,
    login,
    logout,
    expire,
  }
})