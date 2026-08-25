import type { AuthSession } from '@/types/domain'

const AUTH_KEY = 'tcm.auth-session'
const CONTEXT_KEY = 'tcm.context-ids'


export interface StoredContextIds {
  patientId: string
  medicalHistoryId?: string
  expertId: string
}


export function loadAuthSession(): AuthSession | null {
  const value = uni.getStorageSync(AUTH_KEY) as unknown

  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<AuthSession>

  if (
      typeof candidate.accessToken !== 'string' ||
      typeof candidate.expiresAt !== 'string' ||
      !candidate.user
  ) {
    uni.removeStorageSync(AUTH_KEY)
    return null
  }

  const expiresAt = new Date(
      candidate.expiresAt,
  ).getTime()

  /*
   * 防止本地缓存里出现无法解析的时间字符串。
   */
  if (Number.isNaN(expiresAt)) {
    uni.removeStorageSync(AUTH_KEY)
    return null
  }

  return candidate as AuthSession
}


export function saveAuthSession(
    session: AuthSession,
): void {
  uni.setStorageSync(
      AUTH_KEY,
      session,
  )
}


export function clearAuthSession(): void {
  uni.removeStorageSync(AUTH_KEY)
}


export function loadContextIds(): StoredContextIds | null {
  const value = uni.getStorageSync(
      CONTEXT_KEY,
  ) as unknown

  if (!value || typeof value !== 'object') {
    return null
  }

  const ids = value as Partial<StoredContextIds>

  if (
      typeof ids.patientId !== 'string' ||
      (
          ids.medicalHistoryId !== undefined &&
          typeof ids.medicalHistoryId !== 'string'
      ) ||
      typeof ids.expertId !== 'string'
  ) {
    return null
  }

  return ids as StoredContextIds
}


export function saveContextIds(
    ids: StoredContextIds,
): void {
  uni.setStorageSync(
      CONTEXT_KEY,
      ids,
  )
}


export function clearBusinessStorage(): void {
  uni.removeStorageSync(CONTEXT_KEY)
}