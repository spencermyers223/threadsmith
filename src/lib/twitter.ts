/**
 * Twitter/X Intent utilities for Post Now feature
 */

/**
 * Strip HTML tags from a string and convert to plain text
 */
function stripHtmlTags(html: string): string {
  // Replace <br> and <br/> with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n')
  
  // Replace </p><p> with double newline (paragraph breaks)
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
  
  // Replace closing block tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ')
  text = text.replace(/&amp;/gi, '&')
  text = text.replace(/&lt;/gi, '<')
  text = text.replace(/&gt;/gi, '>')
  text = text.replace(/&quot;/gi, '"')
  text = text.replace(/&#39;/gi, "'")
  
  // Clean up multiple newlines and trim
  text = text.replace(/\n{3,}/g, '\n\n')
  
  return text.trim()
}

/**
 * Extract plain text from TipTap JSON content or plain string
 */
export function getPostTweetText(content: unknown): string {
  if (typeof content === 'string') {
    // Check if it looks like HTML (contains tags)
    if (content.includes('<') && content.includes('>')) {
      return stripHtmlTags(content)
    }
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
