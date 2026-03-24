import { Suspense } from 'react'
import { auth } from '@/auth'
import ChatPage from './ChatPage'

export default async function Page() {
  const session = await auth()
  const userId = session?.user?.email ?? 'guest'
  return (
    <Suspense>
      <ChatPage userId={userId} />
    </Suspense>
  )
}
