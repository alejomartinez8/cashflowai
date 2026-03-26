import { Suspense } from 'react'
import { auth } from '@/auth'
import ChatPage from './ChatPage'
import { listConversationsForUser } from './conversation-actions'

export default async function Page() {
  const session = await auth()
  const userId = session?.user?.email
  const initialConversations = userId ? await listConversationsForUser(userId) : []

  return (
    <Suspense>
      <ChatPage initialConversations={initialConversations} />
    </Suspense>
  )
}
