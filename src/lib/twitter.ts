/**
 * Twitter/X Intent utilities for Post Now feature
 */

/**
 * Extract plain text from TipTap JSON content or plain string
 */
export function getPostTweetText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  // TipTap JSON content - extract text recursively
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractText(node: any): string {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text
    }
    if (Array.isArray(node.content)) {
      return node.content.map((child: unknown) => extractText(child)).join('')
    }
    return ''
  }

  if (content && typeof content === 'object' && 'content' in content) {
    const doc = content as { content: unknown[] }
    if (Array.isArray(doc.content)) {
      const paragraphs: string[] = []
      for (const node of doc.content) {
        const text = extractText(node)
        if (text) paragraphs.push(text)
      }
      return paragraphs.join('\n\n').trim()
    }
  }

  return ''
}

/**
 * Open Twitter/X compose window with pre-filled text.
 * Uses the X intent URL: https://x.com/intent/tweet?text=...
 * Returns true if the window likely opened.
 */
export function openTwitterIntent(text: string): boolean {
  if (!text) return false

  // X/Twitter intent supports long-form now, but truncate at 4000 to be safe
  const maxLength = 4000
  const truncated =
    text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text

  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(truncated)}`

  const newWindow = window.open(intentUrl, '_blank', 'noopener,noreferrer')
  return newWindow !== null
}
