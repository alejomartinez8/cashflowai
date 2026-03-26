'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { UIMessage } from 'ai'

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function extractTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'Nueva conversación'
  const text = firstUser.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join(' ')
  return text.slice(0, 80) || 'Nueva conversación'
}

export async function listConversationsForUser(userId: string) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(50)
}

export async function listConversations() {
  const session = await auth()
  const userId = session?.user?.email
  if (!userId) return []

  return listConversationsForUser(userId)
}

export async function loadConversation(conversationId: string) {
  const session = await auth()
  const userId = session?.user?.email
  if (!userId) return null

  const result = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1)

  if (result.length === 0) return null
  const row = result[0]
  // jsonb is returned as parsed JSON by Neon
  const messages = (typeof row.messages === 'string'
    ? JSON.parse(row.messages)
    : row.messages) as UIMessage[]
  return { ...row, messages }
}

export async function saveConversation(
  conversationId: string | null,
  messages: UIMessage[],
): Promise<string> {
  const session = await auth()
  const userId = session?.user?.email
  if (!userId) throw new Error('Not authenticated')

  if (messages.length === 0) {
    if (conversationId) {
      await db
        .delete(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    }
    return ''
  }

  const title = extractTitle(messages)

  if (conversationId) {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(conversations)
        .set({ title, messages, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId))
      return conversationId
    }
  }

  const id = conversationId || generateId()
  await db.insert(conversations).values({
    id,
    userId,
    title,
    messages,
  })
  return id
}

export async function deleteConversation(conversationId: string) {
  const session = await auth()
  const userId = session?.user?.email
  if (!userId) return

  await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
}
