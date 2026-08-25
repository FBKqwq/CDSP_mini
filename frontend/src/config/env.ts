export interface AppEnv {
  useMock: boolean
  apiBaseUrl: string
  wsBaseUrl: string
}

function normalizeBaseUrl(
    value: string | undefined,
): string {
  return (value ?? '')
      .trim()
      .replace(/\/+$/, '')
}

export const appEnv: AppEnv = {
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',

  apiBaseUrl: normalizeBaseUrl(
      import.meta.env.VITE_API_BASE_URL,
  ),

  wsBaseUrl: normalizeBaseUrl(
      import.meta.env.VITE_WS_BASE_URL,
  ),
}

export function assertRemoteEnv(
    env: AppEnv = appEnv,
): void {
  if (env.useMock) {
    return
  }

  if (!env.apiBaseUrl) {
    throw new Error('未配置 API 地址')
  }

  if (!env.wsBaseUrl) {
    throw new Error('未配置 WebSocket 地址')
  }

  /*
   * 开发环境允许 HTTP / WS 本地联调。
   * 生产环境必须使用 HTTPS / WSS。
   */
  if (import.meta.env.PROD) {
    if (!env.apiBaseUrl.startsWith('https://')) {
      throw new Error(
          '生产环境必须配置 HTTPS API 地址',
      )
    }

    if (!env.wsBaseUrl.startsWith('wss://')) {
      throw new Error(
          '生产环境必须配置 WSS WebSocket 地址',
      )
    }
  }
}