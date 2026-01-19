'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, FileText, X, Copy, Check, Sparkles, ArrowRight, MessageCircle, Wand2 } from 'lucide-react'
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
    if (/^Option \d+:?$/i.test(text.trim())) {
      return <span className="text-lg font-semibold text-[var(--foreground)] block mb-2">{children}</span>
    }
    if (/why this works:?/i.test(text.trim())) {
      return <span className="text-[var(--muted)] italic font-normal text-sm">{children}</span>
    }
    return <strong className="text-[var(--foreground)] font-semibold">{children}</strong>
  },
  em: ({ children }) => {
    const text = String(children)
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

function parseOptionsIntoCards(content: string): { hasOptions: boolean; sections: Array<{ type: 'intro' | 'option'; content: string; optionNum?: number }> } {
  const optionPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:\*{1,2})?Option\s+(\d+)(?:\*{0,2})?:?/gi
  const matches = Array.from(content.matchAll(optionPattern))

  if (matches.length === 0) {
    return { hasOptions: false, sections: [{ type: 'intro', content }] }
  }

  const sections: Array<{ type: 'intro' | 'option'; content: string; optionNum?: number }> = []
  const firstMatchIndex = matches[0].index ?? 0
  if (firstMatchIndex > 0) {
    const introText = content.slice(0, firstMatchIndex).trim()
    if (introText) {
      sections.push({ type: 'intro', content: introText })
    }
  }

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
  let cleanContent = content.replace(/^(?:#{1,3}\s*)?(?:\*{1,2})?Option\s+\d+(?:\*{0,2})?:?\s*/i, '').trim()
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

// Content Type Selection Modal for Writing Assistant
function ContentTypeModal({
  isOpen,
  onClose,
  onSelect,
  userMessageCount
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: ContentType) => void
  userMessageCount: number
}) {
  if (!isOpen) return null

  const getDepthLevel = () => {
    if (userMessageCount <= 6) return 'light'
    if (userMessageCount <= 10) return 'moderate'
    return 'deep'
  }

  const depth = getDepthLevel()

  const getRecommendation = () => {
    switch (depth) {
      case 'light':
        return "Based on our conversation length, I'd recommend: Tweet (best fit). Want to keep talking for richer options?"
      case 'moderate':
        return "You've got solid material! Tweet or Thread would work well. Article is possible but might be on the shorter side."
      case 'deep':
        return "Great conversation! You've got enough material for any format - Tweet, Thread, or Article."
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-2">What do you want to create?</h2>
        <p className="text-sm text-[var(--muted)] mb-4">{getRecommendation()}</p>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('tweet')}
            className={`w-full p-4 rounded-lg border text-left transition-colors ${
              depth === 'light'
                ? 'border-accent bg-accent/10'
                : 'border-[var(--border)] hover:border-accent/50'
            }`}
          >
            <div className="font-medium flex items-center gap-2">
              Tweet
              {depth === 'light' && <span className="text-xs text-accent">(Recommended)</span>}
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">Single post, punchy insight</p>
          </button>

          <button
            onClick={() => onSelect('thread')}
            className={`w-full p-4 rounded-lg border text-left transition-colors ${
              depth === 'moderate'
                ? 'border-accent bg-accent/10'
                : 'border-[var(--border)] hover:border-accent/50'
            }`}
          >
            <div className="font-medium flex items-center gap-2">
              Thread
              {depth === 'moderate' && <span className="text-xs text-accent">(Recommended)</span>}
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">5-15 connected posts, deeper exploration</p>
          </button>

          <button
            onClick={() => onSelect('article')}
            className={`w-full p-4 rounded-lg border text-left transition-colors ${
              depth === 'deep'
                ? 'border-accent bg-accent/10'
                : 'border-[var(--border)] hover:border-accent/50'
            }`}
          >
            <div className="font-medium flex items-center gap-2">
              Article
              {depth === 'deep' && <span className="text-xs text-accent">(Recommended)</span>}
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">Long-form, comprehensive take</p>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>
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
  const [writingAssistantMode, setWritingAssistantMode] = useState(false)
  const [showContentTypeModal, setShowContentTypeModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const userMessageCount = messages.filter(m => m.role === 'user').length

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

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setCurrentConvId(convId)
        if (data.writing_assistant_mode) {
          setWritingAssistantMode(true)
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [])

  const saveConversation = useCallback(async (msgs: Message[], isWritingAssistant: boolean = false) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConvId,
          messages: msgs,
          writing_assistant_mode: isWritingAssistant
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

  useEffect(() => {
    if (conversationId === null) {
      setMessages([])
      setCurrentConvId(null)
      setWritingAssistantMode(false)
    } else if (conversationId && conversationId !== currentConvId) {
      loadConversation(conversationId)
    }
  }, [conversationId, currentConvId, loadConversation])

  useEffect(() => {
    onRefreshRef?.(() => {
      if (currentConvId) {
        loadConversation(currentConvId)
      }
    })
  }, [onRefreshRef, currentConvId, loadConversation])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Start Writing Assistant mode with opening message
  const startWritingAssistant = async () => {
    setWritingAssistantMode(true)
    setMessages([])
    setCurrentConvId(null)
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat/writing-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], isStart: true }),
      })

      if (!res.ok) throw new Error('Failed to start writing assistant')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantMessage = ''
      setMessages([{ role: 'assistant', content: '' }])

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
                setMessages([{ role: 'assistant', content: assistantMessage }])
              }
            } catch {}
          }
        }
      }

      saveConversation([{ role: 'assistant', content: assistantMessage }], true)
    } catch (err) {
      console.error('Writing assistant error:', err)
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    const newUserMessage: Message = { role: 'user', content: userMessage }
    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)

    let finalMessages: Message[] = []

    try {
      const endpoint = writingAssistantMode ? '/api/chat/writing-assistant' : '/api/chat'
      const body = writingAssistantMode
        ? { messages: updatedMessages }
        : { message: userMessage, contentType, useAllFiles, selectedFileIds }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
                  finalMessages = updated
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      if (finalMessages.length > 0) {
        saveConversation(finalMessages, writingAssistantMode)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => {
        const updated = [...prev, { role: 'assistant' as const, content: 'Sorry, something went wrong. Please try again.' }]
        finalMessages = updated
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleGenerateFromConversation = async (selectedType: ContentType) => {
    setShowContentTypeModal(false)
    setIsGenerating(true)
    setIsStreaming(true)

    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content)

    try {
      const res = await fetch('/api/chat/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessages,
          contentType: selectedType,
          conversationId: currentConvId
        }),
      })

      if (!res.ok) throw new Error('Failed to generate content')

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
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      // Update content type for workspace
      setContentType(selectedType)
    } catch (err) {
      console.error('Generate error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong generating content. Please try again.' }])
    } finally {
      setIsStreaming(false)
      setIsGenerating(false)
    }
  }

  const handleCopyToWorkspace = (content: string, msgIndex: number, optionNum?: number) => {
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

  const exitWritingAssistant = () => {
    setWritingAssistantMode(false)
    setMessages([])
    setCurrentConvId(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !writingAssistantMode ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-accent mb-4" />
            <h2 className="text-xl font-semibold mb-2">Start creating content</h2>
            <p className="text-[var(--muted)] max-w-md mb-6">
              Select a content type, optionally attach your research files, and describe
              what you want to create.
            </p>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span>or</span>
            </div>
            <button
              onClick={startWritingAssistant}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-accent/50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-accent" />
              <span>Start Writing Assistant</span>
            </button>
            <p className="text-xs text-[var(--muted)] mt-2 max-w-sm">
              Have a conversation to explore your ideas, then generate content from your own words
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
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
                  {msg.role === 'assistant' && msg.content && !isStreaming && !writingAssistantMode && (
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
            ))}
          </>
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

      {/* Writing Assistant Notifications */}
      {writingAssistantMode && !isStreaming && (
        <div className="px-6 pb-2 space-y-2">
          {userMessageCount >= 4 && userMessageCount < 10 && (
            <div className="text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
              You can generate content now, or keep going - longer conversations often produce better results.
            </div>
          )}
          {userMessageCount >= 10 && (
            <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-3">
              Great conversation! You&apos;ve got plenty of material to work with.
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-[var(--border)] p-4">
        {/* Mode Toggle & Content Type Selector */}
        <div className="flex items-center justify-between gap-2 mb-3 relative z-20">
          <div className="flex items-center gap-2">
            {!writingAssistantMode ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/30 rounded-full">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-sm text-accent font-medium">Writing Assistant</span>
                </div>
                {userMessageCount > 0 && (
                  <span className="text-sm text-[var(--muted)]">{userMessageCount} responses</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {writingAssistantMode && userMessageCount >= 4 && !isStreaming && (
              <button
                onClick={() => setShowContentTypeModal(true)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                Generate from conversation
              </button>
            )}
            {writingAssistantMode && (
              <button
                onClick={exitWritingAssistant}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* Context Options (only in normal mode) */}
        {!writingAssistantMode && (
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
                        fetchFiles()
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
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              writingAssistantMode
                ? 'Share your thoughts...'
                : contentType === 'tweet'
                ? 'Generate tweet ideas about...'
                : contentType === 'thread'
                ? 'Generate thread ideas about...'
                : 'Generate article ideas about...'
            }
            className="flex-1 px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-[var(--foreground)] placeholder:text-[var(--muted)]"
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

      {/* Content Type Modal */}
      <ContentTypeModal
        isOpen={showContentTypeModal}
        onClose={() => setShowContentTypeModal(false)}
        onSelect={handleGenerateFromConversation}
        userMessageCount={userMessageCount}
      />
    </div>
  )
}
