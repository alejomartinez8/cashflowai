# CashflowAI — Architecture Roadmap

Reference document for architectural improvements identified during deep review.
Ordered by priority. Tackle one at a time.

*Last updated: 2025-03-25*

---

## P0 — Critical (breaks production functionality)

### P0-A: Google OAuth token refresh
- [ ] **Implement auto-refresh for expired Google access tokens**

**Problem:** Google access tokens expire after ~1 hour. Without automatic refresh,
the user must re-login every hour and all Sheets calls fail with `AUTH_REQUIRED`.

**Files:** `auth.ts`, `lib/sheets/client.ts`

**Solution:**
- Store `refresh_token` and `expires_at` in the JWT callback alongside `access_token`
- Before returning the token, check if it has expired
- If expired, POST to `https://oauth2.googleapis.com/token` with `grant_type: refresh_token`
- Update `accessToken` and `expiresAt` in the JWT

```typescript
// auth.ts — jwt callback
if (Date.now() > token.expiresAt) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  })
  const tokens = await response.json()
  token.accessToken = tokens.access_token
  token.expiresAt = Date.now() + tokens.expires_in * 1000
}
```

**Effort:** ~2h

---

### P0-B: Context window management
- [ ] **Compact old tool results and implement sliding window**

**Problem:** The LLM request sends the entire message history without truncation.
Tool results containing sheet data are large. Long conversations exceed the context
window, waste tokens, and degrade response quality.

**Files:** `app/api/ai/chat/route.ts`

**Solution:**
- Always keep: system prompt + last N messages (sliding window)
- Compact old tool results: after the AI has already responded, raw data is no longer needed
- Replace tool results older than 2 turns with `[Sheet data already processed]`

```typescript
function compactOldToolResults(messages: Message[]): Message[] {
  const cutoff = messages.length - 6 // keep last 3 full turns
  return messages.map((msg, i) => {
    if (i < cutoff && msg.role === 'tool') {
      return { ...msg, content: '[Sheet data already processed]' }
    }
    return msg
  })
}
```

**Effort:** ~4h

---

## P1 — High priority (significant quality and DX improvements)

### P1-A: Charts as a dedicated tool (replace fence blocks)
- [ ] **Add `render_chart` tool instead of parsing ` ```chart ``` ` fence blocks**

**Problem:** Parsing ` ```chart ``` ` in the frontend is fragile. A malformed JSON
breaks the parse, and during streaming the JSON can be cut in half. A tool-based
approach is more elegant and aligned with how Vercel AI SDK works.

**Files:** `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`,
`components/chat/MessageBubble.tsx`, `hooks/use-chat.ts`

**Solution:**
- Add `render_chart` tool to the route handler
- The AI calls this tool with the Vega-Lite spec as a structured object (not a string)
- The frontend detects `render_chart` tool calls and renders `<ChartMessage>`
- Remove fence-block splitting logic

```typescript
// route.ts
render_chart: tool({
  description: 'Render a Vega-Lite chart with the analyzed data',
  parameters: z.object({
    spec: z.record(z.unknown()).describe('Vega-Lite v5 spec with inline data'),
    title: z.string().optional(),
  }),
  execute: async ({ spec }) => ({ spec }), // pass-through, frontend renders
})
```

**Benefits:**
- Spec comes structured (no string parsing needed)
- AI SDK handles streaming natively
- No false positives if the AI mentions "chart" in another context

**Effort:** ~3h

---

### P1-B: Observability — AI usage logging
- [ ] **Add structured logging for token usage, tool calls, and latency**

**Problem:** No visibility into which tools the AI calls, how many tokens each request
consumes, or what errors occur in production. Without this, iterative improvement is impossible.

**Files:** `app/api/ai/chat/route.ts`

**Minimal solution (structured console.log):**

```typescript
const result = streamText({
  // ...
  onFinish: ({ usage, steps, finishReason }) => {
    console.log(JSON.stringify({
      event: 'ai_response',
      model: `${provider}:${model}`,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      steps: steps.length,
      toolCalls: steps.flatMap(s => s.toolCalls ?? []).map(t => t.toolName),
      finishReason,
      durationMs: Date.now() - startTime,
    }))
  }
})
```

**Advanced solution:** Integrate Langfuse (open source, free tier) for full per-step traceability.

**Effort:** ~2h (basic) / ~4h (Langfuse)

---

### P1-C: Inject available tabs into system prompt
- [ ] **Pre-load tabs server-side to avoid redundant `list_available_tabs()` calls**

**Problem:** The system prompt instructs the AI to call `list_available_tabs()` on every
turn, but tabs rarely change during a conversation. This wastes a tool call + LLM
round-trip per message (~30% of latency).

**Files:** `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`

**Solution:**
- In the route handler, call `listTabs()` before `streamText()`
- Pass the tab list to `buildSystemPrompt({ availableTabs })`
- The AI receives tabs as context and goes straight to `get_sheet_data`
- Keep `list_available_tabs` as a fallback tool (in case AI needs to re-discover)

```typescript
// route.ts
const availableTabs = await listTabs(accessToken)
const systemPrompt = buildSystemPrompt({ availableTabs })
```

**Effort:** ~1h

---

### P1-D: Refactor — extract business logic to `lib/actions/`
- [ ] **Create `lib/actions/` to decouple business logic from route handlers**

**Problem:** Business logic is mixed inside route handlers, making it hard to test,
reuse, and migrate to Server Actions. This is also preparation for adding Neon DB persistence.

**Current state:**
- `app/api/ai/chat/route.ts` — chat logic mixed with HTTP handling
- `app/api/sheets/route.ts` — sheets logic mixed with HTTP handling
- `app/chat/actions.ts` — already uses Server Actions (good)

**Proposed structure:**

```
lib/
  actions/
    chat.ts        # chat logic: buildChatPayload, validateChatRequest
    sheets.ts      # sheets logic: fetchSheetData, formatForAI
    db/
      messages.ts  # message CRUD for Neon (persistence preparation)
      users.ts     # user management (multi-user preparation)
```

**Rules:**
- `lib/actions/` contains pure logic (no HTTP, no headers, no Response objects)
- Route handlers and Server Actions become thin glue code calling these functions
- `lib/actions/db/` functions will interact with Neon

**Migration example:**

```typescript
// lib/actions/chat.ts
export async function processChat(params: {
  messages: Message[]
  provider: string
  model: string
  accessToken: string
}) {
  const availableTabs = await listTabs(params.accessToken)
  const systemPrompt = buildSystemPrompt({ availableTabs })
  // ... streamText logic
}

// app/api/ai/chat/route.ts (becomes thin)
export async function POST(req: Request) {
  const session = await auth()
  // validation...
  return processChat({ messages, provider, model, accessToken: session.accessToken })
}
```

**Effort:** ~4h

---

## P2 — Medium priority (important for production readiness)

### P2-A: Message persistence with Neon DB
- [ ] **Add PostgreSQL persistence for conversations and messages**

**Requires:** P1-D (`lib/actions/db/` must exist first)

**Problem:** Conversation history lives only in localStorage. Clearing the browser
loses everything. No cross-device access.

**Proposed stack:**
- Neon (serverless PostgreSQL, generous free tier)
- Drizzle ORM (TypeScript-first, lightweight, well-integrated with Next.js)

**Initial schema:**

```sql
-- conversations
id          uuid primary key default gen_random_uuid()
user_email  text not null
created_at  timestamp default now()
updated_at  timestamp default now()

-- messages
id              uuid primary key default gen_random_uuid()
conversation_id uuid references conversations(id) on delete cascade
role            text not null  -- 'user' | 'assistant'
content         text not null
tool_calls      jsonb          -- AI tool calls
metadata        jsonb          -- tokens used, model, duration
created_at      timestamp default now()
```

**New files:**
- `lib/db/schema.ts` — Drizzle schema
- `lib/db/index.ts` — Neon connection
- `lib/actions/db/messages.ts` — `saveMessage()`, `getMessages()`, `clearConversation()`

**New env var:**
```
DATABASE_URL=postgres://...@neon.tech/cashflowai
```

**Effort:** ~6h

---

### P2-B: Cross-session memory (user profile)
- [ ] **Persist user goals and preferences so the AI remembers across sessions**

**Requires:** P2-A (needs DB for persistence)

**Problem:** The AI doesn't remember goals, preferences, or personal context between
sessions. For a financial coach, memory is critical.

**Solution:**
- `user_profiles` table in Neon with fields: goals, context_notes, preferences
- `update_user_context` tool the AI can call when it detects relevant info
- Inject profile into system prompt on every conversation

**Effort:** ~4h (after P2-A is done)

---

### P2-C: Rate limiting
- [ ] **Add request rate limiting to protect API keys**

**Problem:** No protection against excessive usage that burns through API keys.

**Files:** `app/api/ai/chat/route.ts`

**Minimal solution (in-memory, sufficient for single-user):**

```typescript
const rateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string, limit = 20): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(email)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(email, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
```

**Effort:** ~1h

---

### P2-D: Validate chart specs before rendering
- [ ] **Add Zod validation for Vega-Lite specs before passing to vega-embed**

**Problem:** The AI-generated Vega-Lite spec is passed directly to vega-embed without
validation. Malformed specs can cause silent rendering errors.

**Files:** `components/chat/ChartMessage.tsx`

**Solution:**
- Validate with Zod that the spec has at least `$schema`, `mark`, `encoding`
- If invalid, show a descriptive error instead of a blank chart

**Effort:** ~2h

---

## P3 — Low priority (optimizations and future scalability)

### P3-A: Persistent cache with Upstash Redis
- [ ] **Replace in-memory Map cache with serverless-safe alternative**

**Problem:** The in-memory sheets cache doesn't survive in serverless environments (Vercel)
because each request may hit a different instance.

**Solution:**
- Replace `Map` with Next.js `unstable_cache` (simple, built-in)
- Or use Upstash Redis (free tier) for real distributed cache

**Effort:** ~2h

---

### P3-B: Tool routing / sub-agents for scalability
- [ ] **Design agent routing architecture for future capabilities**

**Problem:** Currently there are 3 tools. As features grow (budgets, goals, alerts),
the tool list expands and the AI gets confused about which to use.

**Proposed pattern:**

```
User Message
    |
Router Agent (decides capability)
    +-- Sheet Analysis Agent (tools: get_data, list_tabs)
    +-- Chart Agent (tool: render_chart)
    +-- Goals Agent (tools: get_goals, set_goal)    [future]
    +-- Budget Agent (tools: get_budget, set_budget) [future]
```

**Effort:** ~8h+ (design + implementation)

---

## Suggested execution order

```
P0-A -> P0-B -> P1-C -> P1-A -> P1-D -> P1-B -> P2-C -> P2-A -> P2-B -> P2-D -> P3-A -> P3-B
```

**Rationale:**
1. First stabilize what already exists (P0)
2. Improve the agent architecture (P1)
3. Add persistence once architecture is clean (P2)
4. Final optimizations (P3)
