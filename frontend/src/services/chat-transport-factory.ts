import { appEnv } from '@/config/env'
import type { ChatTransport, ChatTransportCallbacks } from '@/services/chat-transport'
import { MockSocketSession } from '@/services/mock-socket-session'
import { SocketSession } from '@/services/socket-session'

export interface CreateChatTransportOptions extends ChatTransportCallbacks {
  instanceId: string
  accessToken: string
  sessionVersion: number
  isCurrentVersion: (version: number) => boolean
}

export function createChatTransport(options: CreateChatTransportOptions): ChatTransport {
  return appEnv.useMock ? new MockSocketSession(options) : new SocketSession(options)
}

