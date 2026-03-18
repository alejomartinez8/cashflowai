Build CashflowAI — an AI-powered personal financial assistant.

The user chats with an AI that has full access to their Google Sheets financial data.
The AI analyzes the data and generates dynamic Vega-Lite charts on demand.
No hardcoded parsers. No fixed charts. Everything is driven by the AI.

---

## How it works

1. User asks a question or requests a chart in natural language
2. AI decides which Google Sheets tabs it needs and calls `get_sheet_data` tool
3. Server loads only those tabs from the Sheets API and returns raw 2D arrays
4. AI analyzes the data and responds with text + an optional Vega-Lite spec
5. Frontend renders the spec dynamically with `react-vega`

This is resilient to irregular sheet structures — the AI interprets the data,
the app never parses it manually. The AI only loads the tabs it actually needs,
keeping token usage low and responses focused.

---

## Stack

- Next.js 16 (App Router, Route Handlers)
- TypeScript — all code in English
- Tailwind CSS
- shadcn/ui via MCP — always install via MCP, never copy component code manually
- Vercel AI SDK — unified multi-provider AI interface
- react-vega — renders Vega-Lite specs as dynamic charts
- Google Sheets API v4 — single source of truth, no database
- NextAuth.js v5 — Google OAuth login, access token reused for Sheets API

---

## AI providers

Support `anthropic`, `openai`, and `google` via Vercel AI SDK.
Switching models must be a one-line change controlled by env vars.
Default: `anthropic` / `claude-sonnet-4-5`.
Provider abstraction lives in `lib/ai/providers.ts`.
Never hardcode a model name outside of that file.

```typescript
// lib/ai/providers.ts
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

export function getModel() {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  const model = process.env.AI_MODEL ?? 'claude-sonnet-4-5'
  if (provider === 'openai') return openai(model)
  if (provider === 'google') return google(model)
  return anthropic(model)
}
```

---

## Authentication — Google OAuth via NextAuth.js v5

Login with Google. The same Google access token is used to call the Sheets API —
no Service Account, no private key.

Only one email is allowed in. Everyone else is rejected at the middleware level.

```typescript
// auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // Request Sheets read access alongside basic profile
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the Google access token so we can call Sheets API
      if (account) token.accessToken = account.access_token
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
})
```

```typescript
// middleware.ts — single-user protection
import { auth } from '@/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAllowedEmail = req.auth?.user?.email === process.env.ALLOWED_EMAIL

  if (!isLoggedIn || !isAllowedEmail) {
    return Response.redirect(new URL('/login', req.url))
  }
})

export const config = {
  matcher: ['/((?!login|api/auth).*)'],
}
```

```typescript
// lib/sheets/client.ts — use session token instead of service account
import { auth } from '@/auth'
import { google } from 'googleapis'

export async function getSheetsClient() {
  const session = await auth()
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session?.accessToken })
  return google.sheets({ version: 'v4', auth: oauth2Client })
}
```

```typescript
// app/login/page.tsx — simple login screen
import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <form action={async () => { 'use server'; await signIn('google') }}>
      <button type="submit">Iniciar sesión con Google</button>
    </form>
  )
}
```

## Environment variables

```env
# Google OAuth + Sheets (no service account needed)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_ID=

# Single-user access control
ALLOWED_EMAIL=your@gmail.com

# NextAuth
AUTH_SECRET=                   # generate with: npx auth secret

# AI provider
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5

# API keys (only the active provider is required)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

---

## Project structure

```
cashflowai/
├── auth.ts                               ← NextAuth config
├── middleware.ts                         ← single-user route protection
├── .env.local                            ← gitignored
├── .env.local.example
├── .gitignore
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          ← redirects to /chat
│   ├── login/
│   │   └── page.tsx                      ← Google sign-in button
│   ├── chat/
│   │   └── page.tsx                      ← main UI: chat + charts
│   └── api/
│       ├── auth/[...nextauth]/route.ts   ← NextAuth handler
│       ├── sheets/route.ts               ← GET — raw sheet data as context
│       └── ai/chat/route.ts              ← POST — streaming chat + Vega-Lite
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChartMessage.tsx              ← renders Vega-Lite spec via react-vega
│   │   └── QuickPrompts.tsx
│   └── ui/                              ← shadcn/ui
├── lib/
│   ├── sheets/
│   │   └── client.ts                    ← Sheets API using session access token
│   ├── ai/
│   │   ├── providers.ts                 ← multi-provider abstraction
│   │   └── prompts.ts                   ← system prompt builder
│   ├── types.ts
│   └── formatters.ts
└── hooks/
    └── use-chat.ts
```

---

## Google Sheets — loading strategy

The AI loads tabs on demand via tool calling. Never parse data manually.

```typescript
// lib/sheets/client.ts
const TABS = ['2025', '2024', '2023', 'Proyecciones', 'Balance', 'New Home', 'Deudas Banco', 'Prestamos'] as const
export type TabName = typeof TABS[number]

export async function loadTabs(tabs: TabName[]): Promise<Record<TabName, string[][]>> {
  const results = await Promise.all(tabs.map(tab => getTab(tab)))
  return Object.fromEntries(tabs.map((tab, i) => [tab, results[i]])) as Record<TabName, string[][]>
}
```

Each tab is cached individually with a 5-minute TTL using a simple in-memory Map + timestamp. No libraries.

```typescript
// Tool definition — used in the AI chat route
get_sheet_data: tool({
  description: 'Carga tabs del Google Sheet del usuario. Llama esta herramienta antes de responder cualquier pregunta sobre datos financieros.',
  parameters: z.object({
    tabs: z.array(z.enum(TABS)).describe('Tabs a cargar'),
  }),
  execute: async ({ tabs }) => loadTabs(tabs),
})
```

The AI calls this tool, receives the raw 2D arrays, then generates its response.
A `"Consultando [tab]..."` indicator is shown in the UI while the tool executes.

### Sheet structure notes

- Tabs are irregular — do not assume uniform positions across tabs
- Column A is usually empty; data starts at column B
- Values are plain integers in COP (5290000 = $5,290,000 COP)
- Annual tabs (2020–2027) share a similar but evolving layout:
  row 4 = month headers, row 7 = income, row 8 = expenses, row 15 = passive income

---

## AI response format

Use `streamText()` with `tools` and `maxSteps`. The AI first calls `get_sheet_data`,
then streams a final response. The response text embeds chart specs as a fenced
JSON block so the frontend can parse and render it.

```typescript
// app/api/ai/chat/route.ts
import { streamText, tool, stepCountIs } from 'ai'

const result = await streamText({
  model: getModel(),
  system: buildSystemPrompt(),   // no data injected — AI fetches it via tool
  messages,
  tools: { get_sheet_data },
  stopWhen: stepCountIs(3),      // tool call + optional retry + final response
})

return result.toUIMessageStreamResponse()
```

The AI formats its final response as:

```
Texto de respuesta conversacional...

```chart
{ ...vega-lite v5 spec... }
```
```

The frontend splits on the fenced block to extract text and chart separately.

---

## System prompt (lib/ai/prompts.ts)

No data is injected — the AI fetches it via tool. The prompt focuses on behavior rules.

```typescript
export const buildSystemPrompt = (): string => `
You are CashflowAI, a personal financial assistant with access to the user's
Google Sheets financial data via the get_sheet_data tool.

GOAL: The user is a Colombian software developer executing a 10-year financial
freedom plan (2021–2032). Passive income must exceed monthly expenses by 2032.
Current passive income: ~$X.XXX.XXX COP/month
Current expenses: ~$XX.XXX.XXX COP/month
Freedom ratio: ~XX% — target is 100%+

DATA ACCESS — call get_sheet_data before answering any financial question.
Available tabs: 2025, 2024, 2023, Proyecciones, Balance, New Home, Deudas Banco, Prestamos
Only load the tabs you actually need.

CHART FORMAT — when a chart adds value, append a fenced block at the end:
\`\`\`chart
{ ...vega-lite v5 spec with inline data... }
\`\`\`

CHART RULES:
- Generate valid Vega-Lite v5 specs only
- All labels, titles, and axis names in Colombian Spanish
- Format COP values as millions in chart axes (e.g. $5.3M)
- Always embed data inline in the spec — never use external URLs
- Choose chart type that best communicates the insight:
  area/line for trends, bar for comparisons, scatter for correlations

RESPONSE RULES:
- Always respond in Colombian Spanish
- Format currency as $5.290.000 COP in prose
- Be direct and honest — never soften bad news
- Connect every insight to the 2032 financial freedom goal
- Quantify scenarios as months gained or lost toward freedom
`
```

---

## Core types (lib/types.ts)

```typescript
export type TabName =
  | '2025' | '2024' | '2023'
  | 'Proyecciones' | 'Balance'
  | 'New Home' | 'Deudas Banco' | 'Prestamos'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string           // text portion of the response
  chart?: Record<string, unknown>  // parsed Vega-Lite spec (if any)
  timestamp: Date
}
```

---

## Formatters (lib/formatters.ts)

```typescript
export const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export const formatMillions = (value: number): string =>
  `$${(value / 1_000_000).toFixed(1)}M`

export const formatPercentage = (value: number, decimals = 1): string =>
  `${(value * 100).toFixed(decimals)}%`
```

---

## Quick prompts (components/chat/QuickPrompts.tsx)

```typescript
export const QUICK_PROMPTS = [
  '¿Cómo voy vs el plan este año?',
  'Muéstrame la evolución del ingreso pasivo',
  '¿Cuándo alcanzo la libertad financiera?',
  'Grafica gastos fijos vs variables por mes',
  '¿Qué impacto tuvo el sobrecosto de la casa en el plan?',
  'Simula un nuevo ingreso pasivo de $3M al mes',
  'Muéstrame el estado de mis deudas',
  'Compara mis ingresos de 2023, 2024 y 2025',
] as const
```

---

## Implementation plan

Work through these tasks one at a time. Tell me "implement task N" for each one.

- [x] Task 1 — Scaffold: Next.js 16 app with yarn, folder structure, `.env.local.example`,
      `.gitignore`, `lib/types.ts`, `lib/formatters.ts`

- [ ] Task 2 — Auth: install `next-auth@beta`, create `auth.ts` with Google provider
      requesting Sheets read scope, `middleware.ts` with single-email guard,
      `app/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`

- [ ] Task 3 — AI providers: `lib/ai/providers.ts` with `getModel()`,
      install `ai @ai-sdk/react @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google zod`

- [ ] Task 4 — Sheets client: `lib/sheets/client.ts` using session access token
      (no service account), `loadTabs(tabs[])`, per-tab 5-min in-memory cache

- [ ] Task 5 — Sheets route: `app/api/sheets/route.ts`, GET, `?tabs=` param,
      `?refresh=true` support, protected — returns 401 if no valid session

- [ ] Task 6 — System prompt: `lib/ai/prompts.ts` with `buildSystemPrompt()`
      (no data injected), financial freedom goal + chart rules + tool instructions

- [ ] Task 7 — AI chat route: `app/api/ai/chat/route.ts`, POST, `streamText()`
      with `get_sheet_data` tool, `stopWhen: stepCountIs(3)`, `toUIMessageStreamResponse()`, session-protected

- [ ] Task 8 — Chat hook: `hooks/use-chat.ts` wrapping `useChat` from `@ai-sdk/react`,
      localStorage history (max 50), exposes `messages`, `sendMessage`, `status`, `stop`, `clear`

- [ ] Task 9 — Chart component: install `react-vega vega vega-lite`,
      `components/chat/ChartMessage.tsx`, responsive, graceful fallback

- [ ] Task 10 — Chat components: `MessageBubble.tsx`, `ChatWindow.tsx`,
      auto-scroll, typing indicator

- [ ] Task 11 — Quick prompts: `components/chat/QuickPrompts.tsx`,
      disappear after first message

- [ ] Task 12 — Chat page: `app/chat/page.tsx`, full-height layout,
      input fixed at bottom, Enter to send / Shift+Enter for newline

- [ ] Task 13 — Layout: `app/layout.tsx`, minimal nav, user avatar + sign-out button,
      app name, redirect `/` → `/chat`

- [ ] Task 14 — Loading and errors: skeletons, toast on failure,
      Sheets quota error message in Spanish

- [ ] Task 15 — Mobile: responsive audit, charts resize correctly

- [ ] Task 16 — Model switcher: settings dropdown, persists in localStorage,
      shows active model as badge in nav
