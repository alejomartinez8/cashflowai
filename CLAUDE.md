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

### Model selection

Model is selected via URL search param `?model=provider:model-id` (e.g. `?model=anthropic:claude-sonnet-4-6`).
Available providers are detected server-side in `app/chat/layout.tsx` by checking which API keys are set in env, then passed as props to `ModelSwitcher`. The selection persists in `localStorage` and syncs back to the URL on navigation. `lib/ai/providers.ts` exposes `getModel(provider, model)` — never hardcode model names outside that file.

### Sheets loading strategy

`lib/sheets/client.ts` loads tabs on demand. Per-tab 5-minute in-memory cache (simple `Map` + timestamp, no external library). Known tabs: `2025`, `2024`, `2023`, `Proyecciones`, `Balance`, `Deudas Banco`, `Prestamos`. Never parse sheet data manually — the AI interprets raw 2D arrays.

Sheet layout notes:
- Column A is usually empty; data starts at B
- Values are plain integers in COP (e.g. `5290000` = $5,290,000 COP)
- Annual tabs share a similar layout: row 4 = month headers, row 7 = income, row 8 = expenses, row 15 = passive income

### AI chat route

Uses Vercel AI SDK `streamText()` with the `get_sheet_data` tool and `stopWhen: stepCountIs(3)`. Returns `result.toUIMessageStreamResponse()`.

The AI always responds in Colombian Spanish. Charts are embedded as a fenced ` ```chart ``` ` JSON block at the end of the response. The frontend splits on this block to separate prose from the Vega-Lite spec.

### Server Actions

Prefer Server Actions over API routes for server-side logic. New server-side features should use `'use server'` functions in `app/*/actions.ts` files, not new `app/api/` routes. The exception is the existing streaming chat endpoint (`app/api/ai/chat/route.ts`) which must remain a Route Handler because Vercel AI SDK streaming (`toUIMessageStreamResponse`) is incompatible with Server Actions.

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
| `lib/ai/providers.ts` | `getModel(provider, model)` — provider abstraction |
| `lib/ai/prompts.ts` | `buildSystemPrompt()` — generic system prompt, no personal data |
| `hooks/use-model-preference.ts` | Model selection via URL search params + localStorage sync |

## Environment variables

Copy `.env.example` to `.env.local`. Required:

```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
GOOGLE_SHEETS_ID=
ALLOWED_EMAIL=           # only this email can log in
AUTH_SECRET=             # generate: npx auth secret
ANTHROPIC_API_KEY=       # at least one provider key required
OPENAI_API_KEY=          # optional
GOOGLE_GENERATIVE_AI_API_KEY=  # optional
```

## Roadmap (future PRs)

- **Goals v2** — editable financial goals stored in DB (removed from hardcoded prompt in cleanup PR)
- **Persistence** — save conversation history and user config in a lightweight DB (Turso/Neon)
- **Multi-user** — extend auth beyond single `ALLOWED_EMAIL`
- **Generic context** — user profile (name, goals, sheet structure) configurable via UI, not hardcoded
- **API routes → Server Actions** — migrate remaining `/api` routes (e.g. `app/api/ai/chat/route.ts`) to Server Actions where possible, following Next.js 16 conventions
