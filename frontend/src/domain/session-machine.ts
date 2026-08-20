import type { SessionState } from '@/types/domain'

export type SessionAction =
  | 'START'
  | 'INSTANCE_CREATED'
  | 'SOCKET_OPEN'
  | 'SEND'
  | 'STREAM_START'
  | 'STREAM_END'
  | 'INTERRUPT'
  | 'RECONNECT'
  | 'RESTORE_READY'
  | 'FAIL'
  | 'RESET'

const transitions: Record<SessionState, Partial<Record<SessionAction, SessionState>>> = {
  IDLE: { START: 'CREATING_INSTANCE', RESET: 'IDLE' },
  CREATING_INSTANCE: { INSTANCE_CREATED: 'CONNECTING', FAIL: 'FAILED', RESET: 'IDLE' },
  CONNECTING: { SOCKET_OPEN: 'READY', INTERRUPT: 'INTERRUPTED', FAIL: 'FAILED', RESET: 'IDLE' },
  READY: { SEND: 'SENDING', INTERRUPT: 'INTERRUPTED', RESET: 'IDLE' },
  SENDING: { STREAM_START: 'STREAMING', INTERRUPT: 'INTERRUPTED', FAIL: 'FAILED', RESET: 'IDLE' },
  STREAMING: { STREAM_END: 'COMPLETED', INTERRUPT: 'INTERRUPTED', FAIL: 'FAILED', RESET: 'IDLE' },
  COMPLETED: { SEND: 'SENDING', INTERRUPT: 'INTERRUPTED', RESET: 'IDLE' },
  INTERRUPTED: { RECONNECT: 'RECONNECTING', FAIL: 'FAILED', RESET: 'IDLE' },
  RECONNECTING: {
    SOCKET_OPEN: 'READY',
    STREAM_START: 'STREAMING',
    INTERRUPT: 'INTERRUPTED',
    FAIL: 'FAILED',
    RESET: 'IDLE',
  },
  FAILED: { RECONNECT: 'RECONNECTING', START: 'CREATING_INSTANCE', RESET: 'IDLE' },
}

export function transitionSession(state: SessionState, action: SessionAction): SessionState {
  const next = transitions[state][action]
  if (!next) {
    throw new Error(`非法问诊状态迁移: ${state} -> ${action}`)
  }
  return next
}

export function canSendMessage(state: SessionState): boolean {
  return state === 'READY' || state === 'COMPLETED'
}

