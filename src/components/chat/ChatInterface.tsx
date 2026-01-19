'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, FileText, X, Copy, Check, Sparkles, ArrowRight, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReactMarkdown, { Components } from 'react-markdown'

type ContentType = 'tweet' | 'thread' | 'article'

// Custom markdown components for better styling
const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-4 leading-[1.7] text-[var(--foreground)]">{children}</p>
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
    <ul className="my-4 ml-4 space-y-2 leading-[1.7] list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-4 space-y-2 leading-[1.7] list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.7] text-[var(--foreground)] pl-1">{children}</li>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-[var(--foreground)] mt-6 mb-3 border-b border-[var(--border)] pb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[var(--foreground)] mt-5 mb-3">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-[var(--foreground)] bg-[var(--card-hover)] py-3 px-4 rounded-r-lg my-4 leading-[1.7] text-[var(--foreground)]">{children}</blockquote>
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
    <div className="border border-[var(--border)] rounded-xl p-6 mb-5 bg-[var(--card)] hover:border-[var(--muted)] transition-colors">
      {optionNum && (
        <div className="text-lg font-semibold text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
          <span>Option {optionNum}</span>
          {onCopy && (
            <button
              onClick={() => onCopy(content)}
              className="flex items-center gap-1.5 text-sm font-normal text-accent hover:text-accent-hover transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Opening...</span>
                </>
              ) : (
                <>
                  <span>Use this</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
      <div className="prose max-w-none leading-[1.7] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
      <div className="prose max-w-none leading-[1.7] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        if (section.type === 'intro') {
          return (
            <div key={index} className="prose max-w-none leading-[1.7] mb-5 pb-3 border-b border-[var(--border)] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
        return "Based on our conversation, I'd recommend: Tweet (best fit). Want to keep talking for richer options?"
      case 'moderate':
        return "You've got solid material! Tweet or Thread would work well. Article is possible but might be shorter."
      case 'deep':
        return "Great conversation! You've got enough material for any format."
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-float animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-2">What do you want to create?</h2>
        <p className="text-sm text-[var(--muted)] mb-5">{getRecommendation()}</p>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('tweet')}
            className={`w-full p-4 rounded-xl border text-left transition-all duration-150 ${
              depth === 'light'
                ? 'border-accent bg-accent/10 hover:bg-accent/15'
                : 'border-[var(--border)] hover:border-accent/50 hover:bg-[var(--card-hover)]'
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
            className={`w-full p-4 rounded-xl border text-left transition-all duration-150 ${
              depth === 'moderate'
                ? 'border-accent bg-accent/10 hover:bg-accent/15'
                : 'border-[var(--border)] hover:border-accent/50 hover:bg-[var(--card-hover)]'
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
            className={`w-full p-4 rounded-xl border text-left transition-all duration-150 ${
              depth === 'deep'
                ? 'border-accent bg-accent/10 hover:bg-accent/15'
                : 'border-[var(--border)] hover:border-accent/50 hover:bg-[var(--card-hover)]'
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
          className="w-full mt-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
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
  const [showContentTypeDropdown, setShowContentTypeDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const userMessageCount = messages.filter(m => m.role === 'user').length
  const hasMessages = messages.length > 0

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
            } catch {
              // Ignore JSON parse errors
            }
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
            } catch {
              // Ignore JSON parse errors
            }
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
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }

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

  const getAttachLabel = () => {
    if (useAllFiles) return 'All files'
    if (selectedFileIds.length > 0) return `${selectedFileIds.length} file${selectedFileIds.length > 1 ? 's' : ''}`
    return 'Attach'
  }

  // Welcome state (no messages)
  if (!hasMessages && !writingAssistantMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-semibold mb-3 text-[var(--foreground)]">
            Welcome back!
          </h1>
          <p className="text-lg text-[var(--muted)]">
            What would you like to create today?
          </p>
        </div>

        {/* Floating Input */}
        <div className="w-full max-w-2xl animate-fade-in-up">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Describe what you want to create..."
              className="w-full px-5 py-4 pr-14 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-float focus:outline-none focus:border-accent input-glow text-[var(--foreground)] placeholder:text-[var(--muted)] text-base"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-[var(--accent-text)] rounded-xl transition-all duration-150"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Action Pills */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {/* Content Type Pill */}
            <div className="relative">
              <button
                onClick={() => setShowContentTypeDropdown(!showContentTypeDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--muted)] transition-all duration-150"
              >
                <FileText className="w-4 h-4 text-[var(--muted)]" />
                <span className="capitalize">{contentType}</span>
              </button>
              {showContentTypeDropdown && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-float p-1 z-50 animate-fade-in">
                  {(['tweet', 'thread', 'article'] as ContentType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setContentType(type)
                        setShowContentTypeDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        contentType === type
                          ? 'bg-accent/15 text-accent'
                          : 'hover:bg-[var(--card-hover)]'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Writing Assistant Pill */}
            <button
              onClick={startWritingAssistant}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-accent/50 hover:bg-accent/5 transition-all duration-150"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Writing Assistant</span>
            </button>

            {/* Attach Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!showFilePicker) fetchFiles()
                  setShowFilePicker(!showFilePicker)
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-all duration-150 ${
                  useAllFiles || selectedFileIds.length > 0
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted)]'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span>{getAttachLabel()}</span>
              </button>
              {showFilePicker && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-float p-2 z-50 animate-fade-in">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--card-hover)] rounded-lg">
                    <input
                      type="checkbox"
                      checked={useAllFiles}
                      onChange={e => {
                        setUseAllFiles(e.target.checked)
                        if (e.target.checked) setSelectedFileIds([])
                      }}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="font-medium">Use all files</span>
                  </label>
                  {!useAllFiles && (
                    <>
                      <div className="h-px bg-[var(--border)] my-1" />
                      {files.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] text-center py-3">
                          No files uploaded
                        </p>
                      ) : (
                        <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                          {files.map(file => (
                            <li key={file.id}>
                              <button
                                onClick={() => toggleFileSelection(file.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                                  selectedFileIds.includes(file.id)
                                    ? 'bg-accent/15 text-accent'
                                    : 'hover:bg-[var(--card-hover)]'
                                }`}
                              >
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active chat state
  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-[var(--card-hover)] rounded-2xl rounded-br-md px-5 py-3'
                    : ''
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="text-[var(--foreground)] leading-[1.6]">{msg.content}</div>
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
                    className="mt-5 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-sm text-[var(--muted)] hover:text-accent transition-colors w-full"
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
          {isStreaming && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Writing Assistant Notification */}
      {writingAssistantMode && !isStreaming && userMessageCount >= 4 && userMessageCount < 10 && (
        <div className="max-w-3xl mx-auto px-6 pb-2">
          <div className="text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center animate-fade-in">
            You can generate content now, or keep going for richer results
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Area */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                writingAssistantMode
                  ? 'Share your thoughts...'
                  : 'Describe what you want to create...'
              }
              className="w-full px-5 py-4 pr-14 bg-[var(--card)] border border-[var(--border)] rounded-2xl focus:outline-none focus:border-accent input-glow text-[var(--foreground)] placeholder:text-[var(--muted)] text-base"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-[var(--accent-text)] rounded-xl transition-all duration-150"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Action Pills */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {!writingAssistantMode ? (
                <>
                  {/* Content Type Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setShowContentTypeDropdown(!showContentTypeDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--muted)] transition-all duration-150"
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="capitalize text-[var(--foreground-muted)]">{contentType}</span>
                    </button>
                    {showContentTypeDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-40 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-float p-1 z-50 animate-fade-in">
                        {(['tweet', 'thread', 'article'] as ContentType[]).map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              setContentType(type)
                              setShowContentTypeDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                              contentType === type
                                ? 'bg-accent/15 text-accent'
                                : 'hover:bg-[var(--card-hover)]'
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Writing Assistant Pill */}
                  <button
                    onClick={startWritingAssistant}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-accent/50 transition-all duration-150"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[var(--foreground-muted)]">Writing Assistant</span>
                  </button>

                  {/* Attach Pill */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (!showFilePicker) fetchFiles()
                        setShowFilePicker(!showFilePicker)
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all duration-150 ${
                        useAllFiles || selectedFileIds.length > 0
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted)]'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{getAttachLabel()}</span>
                    </button>
                    {showFilePicker && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-float p-2 z-50 animate-fade-in">
                        <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--card-hover)] rounded-lg">
                          <input
                            type="checkbox"
                            checked={useAllFiles}
                            onChange={e => {
                              setUseAllFiles(e.target.checked)
                              if (e.target.checked) setSelectedFileIds([])
                            }}
                            className="rounded border-[var(--border)]"
                          />
                          <span className="font-medium">Use all files</span>
                        </label>
                        {!useAllFiles && (
                          <>
                            <div className="h-px bg-[var(--border)] my-1" />
                            {files.length === 0 ? (
                              <p className="text-sm text-[var(--muted)] text-center py-3">
                                No files uploaded
                              </p>
                            ) : (
                              <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                                {files.map(file => (
                                  <li key={file.id}>
                                    <button
                                      onClick={() => toggleFileSelection(file.id)}
                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                                        selectedFileIds.includes(file.id)
                                          ? 'bg-accent/15 text-accent'
                                          : 'hover:bg-[var(--card-hover)]'
                                      }`}
                                    >
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{file.name}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clear selected files */}
                  {(useAllFiles || selectedFileIds.length > 0) && (
                    <button
                      onClick={() => {
                        setUseAllFiles(false)
                        setSelectedFileIds([])
                      }}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Writing Assistant Active Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-accent text-[var(--accent-text)] font-medium">
                    <div className="w-2 h-2 bg-[var(--accent-text)] rounded-full animate-pulse" />
                    <span>Writing Assistant</span>
                  </div>
                  {userMessageCount > 0 && (
                    <span className="text-sm text-[var(--muted)]">{userMessageCount} responses</span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Generate button for Writing Assistant */}
              {writingAssistantMode && userMessageCount >= 4 && !isStreaming && (
                <button
                  onClick={() => setShowContentTypeModal(true)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg transition-all duration-150 disabled:opacity-50 font-medium"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate from conversation
                </button>
              )}

              {/* Exit Writing Assistant */}
              {writingAssistantMode && (
                <button
                  onClick={exitWritingAssistant}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        </div>
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
