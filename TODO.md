# CashflowAI — Task Tracker

## Completed

- [x] Task 9 — Chart component: install `react-vega vega vega-lite`, create `components/chat/ChartMessage.tsx`, responsive with graceful fallback
- [x] Task 14 — Loading and errors: skeletons, toast on failure, Sheets quota error message in Spanish
- [x] Task 15 — Mobile: responsive audit, charts resize correctly
- [x] Task 16 — Model switcher: dropdown in nav, persists in localStorage, shows active model as badge

## Pending — P0 (Critical)

- [ ] P0-A — Google OAuth token refresh: store `refresh_token` + `expires_at` in JWT, auto-refresh before Sheets calls (`auth.ts`, `lib/sheets/client.ts`)
- [ ] P0-B — Context window management: compact old tool results, sliding window to prevent exceeding LLM context (`app/api/ai/chat/route.ts`)

## Pending — P1 (High Priority)

- [ ] P1-A — Charts as a dedicated tool (`render_chart`) instead of fragile fence-block parsing (`app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`, `components/chat/MessageBubble.tsx`)
- [ ] P1-B — Observability: structured logging of token usage, tool calls, and latency per request; evaluate Langfuse integration (`app/api/ai/chat/route.ts`)
- [ ] P1-C — Inject available tabs into system prompt on every turn to avoid redundant `list_available_tabs()` calls (`app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`)
- [ ] P1-D — Refactor: create `lib/actions/` to extract business logic out of API route handlers; prepare `lib/actions/db/` structure for Neon DB (`app/api/ai/chat/route.ts`, `app/api/sheets/route.ts`)

## Pending — P2 (Medium Priority)

- [ ] P2-A — Message persistence with Neon DB + Drizzle ORM: schema for `conversations` and `messages`, replace localStorage history (requires P1-D)
- [ ] P2-B — Cross-session memory: `user_profiles` table, `update_user_context` tool, inject profile into system prompt (requires P2-A)
- [ ] P2-C — Rate limiting: in-memory limiter (20 req/min) on the chat endpoint (`app/api/ai/chat/route.ts`)
- [ ] P2-D — Validate Vega-Lite chart specs with Zod before passing to vega-embed (`components/chat/ChartMessage.tsx`)

## Pending — P3 (Low Priority / Future)

- [ ] P3-A — Persistent cache with Upstash Redis or Next.js `unstable_cache` to replace in-memory Map (serverless-safe)
- [ ] P3-B — Tool routing / sub-agents architecture to support future capabilities (goals, budgets, alerts) without overwhelming the main agent

---

See `ROADMAP.md` for full details, code examples, and effort estimates.

**Suggested execution order:**
`P0-A → P0-B → P1-C → P1-A → P1-D → P1-B → P2-C → P2-A → P2-B → P2-D → P3-A → P3-B`
