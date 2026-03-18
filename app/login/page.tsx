import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">CashflowAI</h1>
          <p className="mt-2 text-zinc-400">Tu asistente financiero personal</p>
        </div>
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/chat' })
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 shadow-md transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Iniciar sesión con Google
          </button>
        </form>
      </div>
    </div>
  )
}
