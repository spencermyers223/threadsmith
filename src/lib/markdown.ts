import { marked } from 'marked'

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
})

/**
 * Convert markdown to HTML for use in Tiptap editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''

  // Parse markdown to HTML
  const html = marked.parse(markdown, { async: false }) as string

  // Clean up the HTML for Tiptap
  return html
    // Remove horizontal rules (Tiptap doesn't handle them well by default)
    .replace(/<hr\s*\/?>/gi, '')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/gi, '')
    .trim()
}

/**
 * Strip markdown and HTML to get plain text
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return ''

  return markdown
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
