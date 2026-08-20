export interface RichTextNode {
  name: 'div' | 'span'
  attrs?: Record<string, string>
  children: Array<RichTextNode | { type: 'text'; text: string }>
}

function textNode(text: string): { type: 'text'; text: string } {
  return { type: 'text', text }
}

function normalizeInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
}

export function parseSafeMarkdown(markdown: string): RichTextNode[] {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line, index, lines) => line.trim() || lines[index - 1]?.trim())
    .map((line) => {
      const heading = line.match(/^(#{1,3})\s+(.+)$/)
      const list = line.match(/^[-*]\s+(.+)$/)
      const content = normalizeInlineMarkdown(heading?.[2] ?? list?.[1] ?? line)
      const prefix = list ? '• ' : ''
      return {
        name: 'div',
        attrs: {
          class: heading ? `md-heading md-heading-${heading[1].length}` : list ? 'md-list' : 'md-line',
        },
        children: [textNode(`${prefix}${content || ' '}`)],
      }
    })
}
