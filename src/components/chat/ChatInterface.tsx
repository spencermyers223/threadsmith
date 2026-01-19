'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, FileText, X, Copy, Check, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReactMarkdown, { Components } from 'react-markdown'

type ContentType = 'tweet' | 'thread' | 'article'

// Custom markdown components for better styling
const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-4 leading-[1.75] text-[var(--foreground)]">{children}</p>
  ),
  strong: ({ children }) => {
    const text = String(children)
    // Check if this is an "Option X:" pattern
    if (/^Option \d+:?$/i.test(text.trim())) {
      return <span className="text-lg font-semibold text-[var(--foreground)] block mb-2">{children}</span>
    }
    // Check if this is "Why this works:" pattern
    if (/why this works:?/i.test(text.trim())) {
      return <span className="text-[var(--muted)] italic font-normal text-sm">{children}</span>
    }
    return <strong className="text-[var(--foreground)] font-semibold">{children}</strong>
  },
  em: ({ children }) => {
    const text = String(children)
    // Check if this is "Why this works:" in italic format
    if (/why this works:?/i.test(text.trim())) {
      return <span className="text-[var(--muted)] italic text-sm">{children}</span>
    }
    return <em className="text-[var(--foreground)] italic">{children}</em>
  },
  ul: ({ children }) => (
    <ul className="my-4 ml-4 space-y-2 leading-[1.75] list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-4 space-y-2 leading-[1.75] list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.75] text-[var(--foreground)] pl-1">{children}</li>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-[var(--foreground)] mt-6 mb-3 border-b border-[var(--border)] pb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[var(--foreground)] mt-5 mb-3">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-[var(--foreground)] bg-[var(--card-hover)] py-3 px-4 rounded-r-lg my-4 leading-[1.75] text-[var(--foreground)]">{children}</blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return <code className={className}>{children}</code>
    }
    return <code className="text-[var(--foreground)] bg-[var(--card-hover)] px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  },
  pre: ({ children }) => (
    <pre className="bg-[var(--card-hover)] p-4 rounded-lg my-4 overflow-x-auto text-sm border border-[var(--border)]">{children}</pre>
  ),
  hr: () => (
    <hr className="my-6 border-[var(--border)]" />
  ),
}

// Parse content to identify and wrap options in cards
function parseOptionsIntoCards(content: string): { hasOptions: boolean; sections: Array<{ type: 'intro' | 'option'; content: string; optionNum?: number }> } {
  // Pattern to match "Option 1:", "**Option 1:**", "## Option 1", etc.
  const optionPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:\*{1,2})?Option\s+(\d+)(?:\*{0,2})?:?/gi

  const matches = Array.from(content.matchAll(optionPattern))

  if (matches.length === 0) {
    return { hasOptions: false, sections: [{ type: 'intro', content }] }
  }

  const sections: Array<{ type: 'intro' | 'option'; content: string; optionNum?: number }> = []

  // Get intro text before first option
  const firstMatchIndex = matches[0].index ?? 0
  if (firstMatchIndex > 0) {
    const introText = content.slice(0, firstMatchIndex).trim()
    if (introText) {
      sections.push({ type: 'intro', content: introText })
    }
  }

  // Extract each option section
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const startIndex = match.index ?? 0
    const endIndex = i < matches.length - 1 ? (matches[i + 1].index ?? content.length) : content.length
    const optionContent = content.slice(startIndex, endIndex).trim()
    const optionNum = parseInt(match[1], 10)

    sections.push({ type: 'option', content: optionContent, optionNum })
  }

  return { hasOptions: true, sections }
}

// Component to render an option card
function OptionCard({
  content,
  optionNum,
  onCopy,
  isCopied
}: {
  content: string
  optionNum?: number
  onCopy?: (content: string) => void
  isCopied?: boolean
}) {
  // Remove the "Option X:" prefix since we'll render it separately
  let cleanContent = content.replace(/^(?:#{1,3}\s*)?(?:\*{1,2})?Option\s+\d+(?:\*{0,2})?:?\s*/i, '').trim()

  // Process "Why this works:" sections - add visual separation
  cleanContent = cleanContent.replace(
    /(\*{0,2}Why this works:?\*{0,2})/gi,
    '\n\n---\n\n*Why this works:*'
  )

  return (
    <div className="border border-[var(--border)] rounded-xl p-5 mb-5 bg-[var(--card)] shadow-card hover:border-[var(--muted)] transition-colors">
      {optionNum && (
        <div className="text-lg font-semibold text-[var(--foreground)] mb-4 pb-2 border-b border-[var(--border)] flex items-center justify-between">
          <span>Option {optionNum}</span>
          {onCopy && (
            <button
              onClick={() => onCopy(content)}
              className="flex items-center gap-1 text-sm font-normal text-accent hover:text-accent-hover transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Opening...</span>
                </>
              ) : (
                <>
                  <span>Use this</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
      <div className="prose max-w-none leading-[1.75] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <ReactMarkdown components={markdownComponents}>{cleanContent}</ReactMarkdown>
      </div>
    </div>
  )
}

// Main assistant message component
function AssistantMessage({
  content,
  onCopyOption,
  copiedOptionNum
}: {
  content: string
  onCopyOption?: (content: string, optionNum: number) => void
  copiedOptionNum?: number | null
}) {
  const { hasOptions, sections } = parseOptionsIntoCards(content)

  if (!hasOptions) {
    return (
      <div className="prose max-w-none leading-[1.75] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        if (section.type === 'intro') {
          return (
            <div key={index} className="prose max-w-none leading-[1.75] mb-5 pb-3 border-b border-[var(--border)] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown components={markdownComponents}>{section.content}</ReactMarkdown>
            </div>
          )
        }
        return (
          <OptionCard
            key={index}
            content={section.content}
            optionNum={section.optionNum}
            onCopy={onCopyOption ? (c) => onCopyOption(c, section.optionNum!) : undefined}
            isCopied={copiedOptionNum === section.optionNum}
          />
        )
      })}
    </div>
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface FileInfo {
  id: string
  name: string
  content: string | null
}

interface ChatInterfaceProps {
  userId: string
  files?: FileInfo[]
  conversationId?: string | null
  onConversationSaved?: (conversationId: string) => void
  onRefreshRef?: (fn: () => void) => void
}

export function ChatInterface({
  files: initialFiles = [],
  conversationId,
  onConversationSaved,
  onRefreshRef
}: ChatInterfaceProps) {
  const [files, setFiles] = useState<FileInfo[]>(initialFiles)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(conversationId ?? null)
  const [input, setInput] = useState('')
  const [contentType, setContentType] = useState<ContentType>('tweet')
  const [useAllFiles, setUseAllFiles] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedOption, setCopiedOption] = useState<{ msgIndex: number; optionNum: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (err) {
      console.error('Failed to fetch files:', err)
    }
  }, [])

  // Load conversation when conversationId changes
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setCurrentConvId(convId)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [])

  // Save conversation to database
  const saveConversation = useCallback(async (msgs: Message[]) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConvId,
          messages: msgs
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (!currentConvId) {
          setCurrentConvId(data.id)
          onConversationSaved?.(data.id)
        }
      }
    } catch (err) {
      console.error('Failed to save conversation:', err)
    }
  }, [currentConvId, onConversationSaved])

  // Handle conversation selection changes from parent
  useEffect(() => {
    if (conversationId === null) {
      // New chat - clear messages
      setMessages([])
      setCurrentConvId(null)
    } else if (conversationId && conversationId !== currentConvId) {
      // Load selected conversation
      loadConversation(conversationId)
    }
  }, [conversationId, currentConvId, loadConversation])

  // Expose refresh function to parent
  useEffect(() => {
    onRefreshRef?.(() => {
      if (currentConvId) {
        loadConversation(currentConvId)
      }
    })
  }, [onRefreshRef, currentConvId, loadConversation])

  // Fetch files on mount
  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])
    setIsStreaming(true)

    let finalMessages: Message[] = []

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          contentType,
          useAllFiles,
          selectedFileIds,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  }
                  finalMessages = updated
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      // Save conversation after successful streaming
      if (finalMessages.length > 0) {
        saveConversation(finalMessages)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => {
        const updated = [
          ...prev,
          { role: 'assistant' as const, content: 'Sorry, something went wrong. Please try again.' },
        ]
        finalMessages = updated
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleCopyToWorkspace = (content: string, msgIndex: number, optionNum?: number) => {
    // Store content in localStorage for workspace
    localStorage.setItem('workspace-content', JSON.stringify({
      content,
      contentType,
      timestamp: Date.now(),
    }))
    setCopiedOption({ msgIndex, optionNum: optionNum ?? 0 })
    setTimeout(() => setCopiedOption(null), 2000)
    router.push('/workspace')
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-accent mb-4" />
            <h2 className="text-xl font-semibold mb-2">Start creating content</h2>
            <p className="text-[var(--muted)] max-w-md">
              Select a content type, optionally attach your research files, and describe
              what you want to create.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-accent text-white px-4 py-3'
                    : 'bg-[var(--card)] border border-[var(--border)] px-6 py-6'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <AssistantMessage
                    content={msg.content}
                    onCopyOption={(content, optionNum) => handleCopyToWorkspace(content, i, optionNum)}
                    copiedOptionNum={copiedOption?.msgIndex === i ? copiedOption.optionNum : null}
                  />
                )}
                {msg.role === 'assistant' && msg.content && !isStreaming && (
                  <button
                    onClick={() => handleCopyToWorkspace(msg.content, i)}
                    className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-accent transition-colors w-full"
                  >
                    {copiedOption?.msgIndex === i && copiedOption.optionNum === 0 ? (
                      <>
                        <Check className="w-4 h-4" />
                        Opening workspace...
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy all to Workspace
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border)] p-4">
        {/* Content Type Selector */}
        <div className="flex items-center gap-2 mb-3 relative z-20">
          <span className="text-sm text-[var(--muted)]">Content type:</span>
          <div className="flex gap-1">
            {(['tweet', 'thread', 'article'] as ContentType[]).map(type => (
              <button
                key={type}
                onClick={() => setContentType(type)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  contentType === type
                    ? 'bg-accent text-white'
                    : 'bg-[var(--card)] hover:bg-[var(--border)]'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Context Options */}
        <div className="flex items-center gap-4 mb-3 relative z-10">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={useAllFiles}
              onChange={e => {
                setUseAllFiles(e.target.checked)
                if (e.target.checked) setSelectedFileIds([])
              }}
              className="rounded border-[var(--border)]"
            />
            Use all files
          </label>

          {!useAllFiles && (
            <>
              <div className="relative">
                <button
                  onClick={() => {
                    if (!showFilePicker) {
                      fetchFiles() // Refresh files when opening picker
                    }
                    setShowFilePicker(!showFilePicker)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[var(--card)] hover:bg-[var(--border)] transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach
                </button>

                {showFilePicker && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-2 z-50">
                    {files.length === 0 ? (
                      <p className="text-sm text-[var(--muted)] text-center py-2">
                        No files uploaded
                      </p>
                    ) : (
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {files.map(file => (
                          <li key={file.id}>
                            <button
                              onClick={() => {
                                toggleFileSelection(file.id)
                                setShowFilePicker(false)
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                                selectedFileIds.includes(file.id)
                                  ? 'bg-accent/20 text-accent'
                                  : 'hover:bg-[var(--border)]'
                              }`}
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Files - Inline Pills */}
              {selectedFileIds.map(id => {
                const file = files.find(f => f.id === id)
                return file ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent/20 text-accent rounded-full"
                  >
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button
                      onClick={() => toggleFileSelection(id)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null
              })}
            </>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              contentType === 'tweet'
                ? 'Generate tweet ideas about...'
                : contentType === 'thread'
                ? 'Generate thread ideas about...'
                : 'Generate article ideas about...'
            }
            className="flex-1 px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
