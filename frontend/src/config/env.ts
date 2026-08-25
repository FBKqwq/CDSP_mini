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

const LOCAL_HTTP_PREFIXES = ['http://localhost', 'http://127.0.0.1', 'http://[::1]']
const LOCAL_WS_PREFIXES = ['ws://localhost', 'ws://127.0.0.1', 'ws://[::1]']

function isLocalDevUrl(value: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

export function assertRemoteEnv(env: AppEnv = appEnv): void {
  if (env.useMock) return
  if (!env.apiBaseUrl) {
    throw new Error('真实模式必须配置 API 网关地址')
  }
  if (!env.apiBaseUrl.startsWith('https://') && !isLocalDevUrl(env.apiBaseUrl, LOCAL_HTTP_PREFIXES)) {
    throw new Error('真实模式必须配置 HTTPS 网关地址（本地联调可用 http://127.0.0.1）')
  }
  if (!env.wsBaseUrl) {
    throw new Error('真实模式必须配置 WSS 网关地址')
  }
  if (!env.wsBaseUrl.startsWith('wss://') && !isLocalDevUrl(env.wsBaseUrl, LOCAL_WS_PREFIXES)) {
    throw new Error('真实模式必须配置 WSS 网关地址（本地联调可用 ws://127.0.0.1）')
  }
}

