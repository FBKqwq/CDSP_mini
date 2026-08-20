import { describe, expect, it } from 'vitest'
import { parseSafeMarkdown } from '@/utils/safe-markdown'

describe('safe markdown nodes', () => {
  it('renders server content as text nodes instead of raw html', () => {
    const nodes = parseSafeMarkdown('<script>stealToken()</script>')
    expect(nodes[0].name).toBe('div')
    expect(nodes[0].children[0]).toEqual({ type: 'text', text: '<script>stealToken()</script>' })
  })

  it('supports headings, lists, emphasis and code as a safe subset', () => {
    const nodes = parseSafeMarkdown('# 标题\n- **症状**：`口渴`')
    expect(nodes[0].attrs?.class).toContain('md-heading')
    expect(nodes[1].children[0]).toEqual({ type: 'text', text: '• 症状：口渴' })
  })

  it('drops link destinations and keeps only visible labels', () => {
    const nodes = parseSafeMarkdown('[查看报告](javascript:alert(1))')
    expect(nodes[0].children[0]).toEqual({ type: 'text', text: '查看报告' })
  })
})
