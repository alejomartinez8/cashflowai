import { auth, signOut } from '@/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { ModelSwitcher } from '@/components/chat/ModelSwitcher'
import Image from 'next/image'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex flex-col h-screen bg-background">
      <nav className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">CashflowAI</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <ModelSwitcher />
          <ThemeToggle />
          <div className="w-px h-4 bg-border mx-0.5" />
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ''}
              width={28}
              height={28}
              className="rounded-full ring-2 ring-border flex-shrink-0"
            />
          )}
          <span className="text-xs text-muted-foreground hidden md:block max-w-[140px] truncate">
            {session?.user?.email}
          </span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted border border-transparent hover:border-border flex-shrink-0"
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
