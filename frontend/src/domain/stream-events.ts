import type { StreamEvent, StreamEventType } from '@/types/domain'

const eventTypes = new Set<StreamEventType>([
  'thinking',
  'output_step',
  'tool_call',
  'tool_result',
  'output',
  'output_end',
  'chat_message',
  'stats',
  'error',
  'system',
])

export function parseStreamEvent(raw: string | Record<string, unknown>): StreamEvent {
  const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!value || typeof value !== 'object') {
    throw new Error('流事件必须是对象')
  }
  const record = value as Record<string, unknown>
  if (typeof record.type !== 'string' || !eventTypes.has(record.type as StreamEventType)) {
    throw new Error('未知流事件类型')
  }
  return {
    id: typeof record.id === 'string' ? record.id : `event-${Date.now()}`,
    type: record.type as StreamEventType,
    content: typeof record.content === 'string' ? record.content : undefined,
    stepNumber: typeof record.stepNumber === 'string' ? record.stepNumber : undefined,
    stepName: typeof record.stepName === 'string' ? record.stepName : undefined,
    timestamp: typeof record.timestamp === 'number' ? record.timestamp : Date.now(),
  }
}

