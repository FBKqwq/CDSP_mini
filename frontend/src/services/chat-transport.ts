import type { StreamEvent } from '@/types/domain'

export type ConnectionPhase = 'connecting' | 'ready' | 'streaming' | 'reconnecting' | 'failed' | 'closed'

export interface ChatTransportCallbacks {
  onEvent: (event: StreamEvent) => void
  onPhase: (phase: ConnectionPhase, detail?: string) => void
}

export interface ChatTransport {
  connect(): Promise<void>
  send(message: string): Promise<void>
  close(): void
}

