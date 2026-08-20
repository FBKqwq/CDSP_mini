import { describe, expect, it } from 'vitest'
import { parseStreamEvent } from '@/domain/stream-events'

describe('stream event parser', () => {
  it('normalizes a supported event', () => {
    const event = parseStreamEvent('{"id":"evt-1","type":"output","content":"你好"}')
    expect(event).toMatchObject({ id: 'evt-1', type: 'output', content: '你好' })
  })

  it('rejects unknown event types', () => {
    expect(() => parseStreamEvent({ type: 'internal_prompt', content: 'secret' })).toThrow(
      '未知流事件类型',
    )
  })

  it('does not expose arbitrary extra fields', () => {
    const event = parseStreamEvent({ type: 'thinking', content: '分析中', token: 'should-not-leak' })
    expect(event).not.toHaveProperty('token')
  })
})

