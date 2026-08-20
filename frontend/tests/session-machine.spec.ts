import { describe, expect, it } from 'vitest'
import { canSendMessage, transitionSession } from '@/domain/session-machine'

describe('consultation session machine', () => {
  it('supports the complete happy path', () => {
    let state = transitionSession('IDLE', 'START')
    state = transitionSession(state, 'INSTANCE_CREATED')
    state = transitionSession(state, 'SOCKET_OPEN')
    expect(canSendMessage(state)).toBe(true)
    state = transitionSession(state, 'SEND')
    state = transitionSession(state, 'STREAM_START')
    expect(canSendMessage(state)).toBe(false)
    state = transitionSession(state, 'STREAM_END')
    expect(state).toBe('COMPLETED')
    expect(canSendMessage(state)).toBe(true)
  })

  it('rejects duplicate sends while streaming', () => {
    expect(() => transitionSession('STREAMING', 'SEND')).toThrow('非法问诊状态迁移')
  })

  it('supports bounded recovery states', () => {
    const interrupted = transitionSession('STREAMING', 'INTERRUPT')
    const reconnecting = transitionSession(interrupted, 'RECONNECT')
    expect(transitionSession(reconnecting, 'STREAM_START')).toBe('STREAMING')
  })
})

