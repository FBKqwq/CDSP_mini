export const MAX_RECONNECT_ATTEMPTS = 5

export function reconnectDelay(attempt: number, random = Math.random): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('重连次数必须从 1 开始')
  }
  const base = Math.min(800 * 2 ** (attempt - 1), 12_800)
  const jitter = Math.floor(random() * 400)
  return base + jitter
}

export function canReconnect(attempt: number, maxAttempts = MAX_RECONNECT_ATTEMPTS): boolean {
  return attempt < maxAttempts
}

