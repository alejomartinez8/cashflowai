import { auth, signOut } from '@/auth'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex flex-col h-screen bg-background">
      <nav className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <span className="font-semibold text-sm tracking-tight">CashflowAI</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? ''}
              className="w-7 h-7 rounded-full"
            />
          )}
          <span className="text-xs text-muted-foreground hidden sm:block">{session?.user?.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              Salir
            </button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  )
}
