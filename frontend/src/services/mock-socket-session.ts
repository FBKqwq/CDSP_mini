import type { ChatTransport, ChatTransportCallbacks } from '@/services/chat-transport'
import type { StreamEvent } from '@/types/domain'

export interface MockSocketSessionOptions extends ChatTransportCallbacks {
  sessionVersion: number
  isCurrentVersion: (version: number) => boolean
}

export class MockSocketSession implements ChatTransport {
  private timers: Array<ReturnType<typeof setTimeout>> = []
  private connected = false

  constructor(private readonly options: MockSocketSessionOptions) {}

  async connect(): Promise<void> {
    this.options.onPhase('connecting')
    await new Promise<void>((resolve) => {
      this.timers.push(
        setTimeout(() => {
          if (!this.isCurrent()) {
            resolve()
            return
          }
          this.connected = true
          this.options.onPhase('ready')
          resolve()
        }, 280),
      )
    })
  }

  async send(message: string): Promise<void> {
    if (!this.connected) throw new Error('Mock Socket 未连接')
    const events: Array<[number, StreamEvent]> = [
      [120, this.event('thinking', '正在梳理症状与病程信息')],
      [380, this.event('output_step', '提取主诉、伴随症状与生活方式', '1', '信息收集')],
      [620, this.event('tool_call', '正在核对代谢风险评估规则')],
      [880, this.event('tool_result', '风险规则匹配完成')],
      [1050, this.event('output', '我已记录您提到的情况。')],
      [1260, this.event('output', this.replyFor(message))],
      [1500, this.event('output_end', '')],
    ]
    this.options.onPhase('streaming')
    events.forEach(([delay, event]) => {
      this.timers.push(
        setTimeout(() => {
          if (!this.isCurrent()) return
          this.options.onEvent(event)
          if (event.type === 'output_end') this.options.onPhase('ready')
        }, delay),
      )
    })
  }

  close(): void {
    this.connected = false
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.options.onPhase('closed')
  }

  private isCurrent(): boolean {
    return this.options.isCurrentVersion(this.options.sessionVersion)
  }

  private event(type: StreamEvent['type'], content: string, stepNumber?: string, stepName?: string): StreamEvent {
    return {
      id: `mock-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      content,
      stepNumber,
      stepName,
      timestamp: Date.now(),
    }
  }

  private replyFor(message: string): string {
    if (/睡眠|失眠/.test(message)) {
      return '睡眠与代谢和情志状态关系密切。请再说明入睡困难、夜醒或早醒中哪一种更明显，以及每晚大约睡多久？'
    }
    if (/口渴|饮水/.test(message)) {
      return '请补充口渴时偏好冷饮还是热饮、每日大致饮水量，以及夜间是否会因口渴醒来。'
    }
    return '为了继续辨证，请补充症状最早出现的时间、一天中加重的时段，以及近期体重和食欲变化。'
  }
}
