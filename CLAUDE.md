# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # start dev server on localhost:3000
yarn build        # production build
yarn lint         # ESLint
```

No test suite is configured yet.

## Architecture

CashflowAI is a single-user AI financial assistant. The user chats with an AI that fetches their Google Sheets data on demand and generates Vega-Lite charts. There is no database — Google Sheets is the only data store.

### Request flow

1. User sends a message → `app/api/ai/chat/route.ts` (POST, streaming)
2. AI calls `get_sheet_data` tool with the tab names it needs
3. `lib/sheets/client.ts` fetches those tabs from Google Sheets API v4 using the user's OAuth access token
4. AI streams a response with optional fenced ` ```chart ``` ` block containing a Vega-Lite v5 spec
5. Frontend (`hooks/use-chat.ts`) splits text from chart, `components/chat/ChartMessage.tsx` renders the spec via `react-vega`

### Authentication

- NextAuth.js v5 (`auth.ts`) — Google OAuth requesting `spreadsheets.readonly` scope
- The Google access token is stored in the JWT and reused for Sheets API calls — no service account
- `proxy.ts` guards all routes except `/login` and `/api/auth/*`; only `ALLOWED_EMAIL` is allowed in
- `types/next-auth.d.ts` extends the Session type to expose `accessToken`

> **Next.js 16 convention:** The route guard file is `proxy.ts` with `export default`, **not** `middleware.ts`. Next.js 16 renamed the middleware convention from `middleware.ts` (Edge runtime) to `proxy.ts` (Node.js runtime). Do not rename or recreate it as `middleware.ts`.

### AI provider abstraction

`lib/ai/providers.ts` (not yet created — Task 6) must expose `getModel()`. Never hardcode model names outside that file. Switch provider/model via env vars:

```
AI_PROVIDER=anthropic   # anthropic | openai | google
AI_MODEL=claude-sonnet-4-5
```

### Sheets loading strategy

`lib/sheets/client.ts` loads tabs on demand. Per-tab 5-minute in-memory cache (simple `Map` + timestamp, no external library). Known tabs: `2025`, `2024`, `2023`, `Proyecciones`, `Balance`, `New Home`, `Deudas Banco`, `Prestamos`. Never parse sheet data manually — the AI interprets raw 2D arrays.

Sheet layout notes:
- Column A is usually empty; data starts at B
- Values are plain integers in COP (e.g. `5290000` = $5,290,000 COP)
- Annual tabs share a similar layout: row 4 = month headers, row 7 = income, row 8 = expenses, row 15 = passive income

### AI chat route

Uses Vercel AI SDK `streamText()` with the `get_sheet_data` tool and `stopWhen: stepCountIs(3)`. Returns `result.toUIMessageStreamResponse()`.

The AI always responds in Colombian Spanish. Charts are embedded as a fenced ` ```chart ``` ` JSON block at the end of the response. The frontend splits on this block to separate prose from the Vega-Lite spec.

### UI components

- `components/ui/` — shadcn/ui components. **Always install via MCP, never copy component code manually.**
- `components/chat/` — `ChatWindow`, `MessageBubble`, `ChartMessage`, `QuickPrompts`

### Key files

| File | Purpose |
|------|---------|
| `auth.ts` | NextAuth config (Google provider + JWT/session callbacks) |
| `proxy.ts` | NextAuth middleware — single-email route guard |
| `lib/types.ts` | `TabName`, `ChatMessage` |
| `lib/formatters.ts` | `formatCOP`, `formatMillions`, `formatPercentage` |
| `types/next-auth.d.ts` | Session type augmentation for `accessToken` |

## Environment variables

Copy `.env.local.example` to `.env.local`. Required:

```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
GOOGLE_SHEETS_ID=
ALLOWED_EMAIL=           # only this email can log in
AUTH_SECRET=             # generate: npx auth secret
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=       # or OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
```

## Implementation status

Tasks are tracked in `TODO.md`. Completed: Task 1 (scaffold), Task 2 (auth). Remaining: Tasks 3–16 (Sheets client, AI providers, API routes, UI components).
