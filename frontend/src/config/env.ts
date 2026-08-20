export interface AppEnv {
  useMock: boolean
  apiBaseUrl: string
  wsBaseUrl: string
}

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '')
}

export const appEnv: AppEnv = {
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  wsBaseUrl: normalizeBaseUrl(import.meta.env.VITE_WS_BASE_URL),
}

export function assertRemoteEnv(env: AppEnv = appEnv): void {
  if (env.useMock) return
  if (!env.apiBaseUrl.startsWith('https://')) {
    throw new Error('真实模式必须配置 HTTPS 网关地址')
  }
  if (!env.wsBaseUrl.startsWith('wss://')) {
    throw new Error('真实模式必须配置 WSS 网关地址')
  }
}

