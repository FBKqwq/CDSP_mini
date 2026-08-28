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
  const loggingOut = ref(false)
  const errorMessage = ref('')

  const isAuthenticated = computed(
    () => Boolean(session.value && session.value.expiresAt > Date.now()),
  )

  async function bootstrap(): Promise<void> {
    if (initialized.value) return
    const cached = loadAuthSession()
    if (!cached || cached.expiresAt <= Date.now()) {
      expire()
      initialized.value = true
      return
    }
    session.value = cached
    try {
      const user = await llmChartApi.me()
      session.value = { ...cached, user }
      saveAuthSession(session.value)
    } catch {
      expire()
    } finally {
      initialized.value = true
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    if (!username.trim() || !password) {
      errorMessage.value = '请输入账号和密码'
      return false
    }
    if (submitting.value) return false
    submitting.value = true
    errorMessage.value = ''
    try {
      const authSession = await llmChartApi.login({ username: username.trim(), password })
      session.value = authSession
      saveAuthSession(authSession)
      return true
    } catch (error) {
      errorMessage.value = toAppError(error, 'AUTH_INVALID').message
      return false
    } finally {
      submitting.value = false
    }
  }

  async function logout(): Promise<boolean> {
    if (loggingOut.value) return false
    loggingOut.value = true
    errorMessage.value = ''
    try {
      if (!session.value) {
        expire()
        return true
      }
      await llmChartApi.logout()
      expire()
      return true
    } catch (error) {
      const appError = toAppError(error, 'SERVICE_UNAVAILABLE')
      if (appError.code === 'TOKEN_INVALID' || appError.code === 'TOKEN_EXPIRED') {
        expire()
        return true
      }
      errorMessage.value = '退出失败，请检查网络后重试'
      return false
    } finally {
      loggingOut.value = false
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
    loggingOut,
    errorMessage,
    isAuthenticated,
    bootstrap,
    login,
    logout,
    expire,
  }
})

