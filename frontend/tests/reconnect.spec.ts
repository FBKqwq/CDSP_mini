import { describe, expect, it } from 'vitest'
import { canReconnect, reconnectDelay } from '@/domain/reconnect'

describe('socket reconnect policy', () => {
  it('uses capped exponential backoff', () => {
    expect(reconnectDelay(1, () => 0)).toBe(800)
    expect(reconnectDelay(2, () => 0)).toBe(1600)
    expect(reconnectDelay(8, () => 0)).toBe(12800)
  })

  it('adds bounded jitter', () => {
    expect(reconnectDelay(1, () => 0.999)).toBe(1199)
  })

  it('stops after the configured maximum', () => {
    expect(canReconnect(4, 5)).toBe(true)
    expect(canReconnect(5, 5)).toBe(false)
  })
})

