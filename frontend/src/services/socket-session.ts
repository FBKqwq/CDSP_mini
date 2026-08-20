import { appEnv, assertRemoteEnv } from '@/config/env'
import { canReconnect, MAX_RECONNECT_ATTEMPTS, reconnectDelay } from '@/domain/reconnect'
import { parseStreamEvent } from '@/domain/stream-events'
import { AppError } from '@/services/app-error'
import type { ChatTransport, ChatTransportCallbacks } from '@/services/chat-transport'

interface SocketTaskLike {
  onOpen(callback: () => void): void
  onMessage(callback: (event: { data: string | ArrayBuffer }) => void): void
  onClose(callback: (event: { code?: number; reason?: string }) => void): void
  onError(callback: (event: { errMsg?: string }) => void): void
  send(options: { data: string; success?: () => void; fail?: (error: { errMsg?: string }) => void }): void
  close(options?: { code?: number; reason?: string }): void
}

export interface SocketSessionOptions extends ChatTransportCallbacks {
  instanceId: string
  accessToken: string
  sessionVersion: number
  isCurrentVersion: (version: number) => boolean
  maxReconnectAttempts?: number
}

export class SocketSession implements ChatTransport {
  private socket: SocketTaskLike | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private manuallyClosed = false
  private open = false

  constructor(private readonly options: SocketSessionOptions) {}

  connect(): Promise<void> {
    assertRemoteEnv()
    this.manuallyClosed = false
    this.options.onPhase(this.reconnectAttempts ? 'reconnecting' : 'connecting')

    return new Promise((resolve, reject) => {
      const socket = uni.connectSocket({
        url: `${appEnv.wsBaseUrl}/ws/v1/llm-chart/stream?instanceId=${encodeURIComponent(this.options.instanceId)}`,
        header: { Authorization: `Bearer ${this.options.accessToken}` },
        complete: () => undefined,
      }) as unknown as SocketTaskLike
      this.socket = socket

      socket.onOpen(() => {
        if (!this.isCurrent()) {
          socket.close({ code: 1000, reason: 'stale session' })
          return
        }
        this.open = true
        this.reconnectAttempts = 0
        this.options.onPhase('ready')
        resolve()
      })

      socket.onMessage((event) => {
        if (!this.isCurrent() || typeof event.data !== 'string') return
        try {
          this.options.onEvent(parseStreamEvent(event.data))
        } catch {
          this.options.onPhase('failed', '收到无法识别的服务端事件')
        }
      })

      socket.onClose((event) => {
        const wasOpen = this.open
        this.open = false
        if (this.manuallyClosed || !this.isCurrent()) {
          if (!wasOpen) resolve()
          return
        }
        this.options.onPhase('reconnecting', event.reason || '连接意外中断')
        this.scheduleReconnect()
        // 首次握手失败时，由内部重连接管；不能让调用方永远等待旧握手。
        if (!wasOpen) resolve()
      })

      socket.onError((event) => {
        this.open = false
        if (!this.isCurrent()) return
        const error = new AppError('STREAM_INTERRUPTED', event.errMsg)
        if (!canReconnect(this.reconnectAttempts, this.maxAttempts)) {
          this.options.onPhase('failed', error.message)
          reject(error)
          return
        }
        this.options.onPhase('reconnecting', error.message)
        this.scheduleReconnect()
        resolve()
      })
    })
  }

  send(message: string): Promise<void> {
    if (!this.socket || !this.open) {
      return Promise.reject(new AppError('STREAM_INTERRUPTED', '连接尚未就绪'))
    }
    return new Promise((resolve, reject) => {
      this.socket?.send({
        data: JSON.stringify({ type: 'chat_message', content: message }),
        success: resolve,
        fail: (error) => reject(new AppError('STREAM_INTERRUPTED', error.errMsg)),
      })
    })
  }

  close(): void {
    this.manuallyClosed = true
    this.open = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close({ code: 1000, reason: 'context closed' })
    this.socket = null
    this.options.onPhase('closed')
  }

  private get maxAttempts(): number {
    return this.options.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS
  }

  private isCurrent(): boolean {
    return this.options.isCurrentVersion(this.options.sessionVersion)
  }

  private scheduleReconnect(): void {
    if (!this.isCurrent() || this.manuallyClosed) return
    if (this.reconnectTimer) return
    if (!canReconnect(this.reconnectAttempts, this.maxAttempts)) {
      this.options.onPhase('failed', `已达到 ${this.maxAttempts} 次自动重连上限`)
      return
    }
    this.reconnectAttempts += 1
    const delay = reconnectDelay(this.reconnectAttempts)
    this.options.onPhase('reconnecting', `第 ${this.reconnectAttempts}/${this.maxAttempts} 次重连`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect().catch(() => undefined)
    }, delay)
  }
}
