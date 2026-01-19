'use client'

import { useState, useCallback, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { ChatInterface } from '@/components/chat/ChatInterface'

interface FileInfo {
  id: string
  name: string
  content: string | null
}

interface DashboardClientProps {
  userId: string
  files: FileInfo[]
}

export function DashboardClient({ userId, files }: DashboardClientProps) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const chatRefreshRef = useRef<(() => void) | null>(null)
  const sidebarRefreshRef = useRef<(() => void) | null>(null)

  const handleSelectConversation = useCallback((conversationId: string | null) => {
    setCurrentConversationId(conversationId)
  }, [])

  const handleConversationSaved = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId)
    // Trigger sidebar refresh
    sidebarRefreshRef.current?.()
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          userId={userId}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onRefreshRef={(fn) => { sidebarRefreshRef.current = fn }}
        />
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <ChatInterface
              userId={userId}
              files={files}
              conversationId={currentConversationId}
              onConversationSaved={handleConversationSaved}
              onRefreshRef={(fn) => { chatRefreshRef.current = fn }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
