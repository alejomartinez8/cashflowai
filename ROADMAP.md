# CashflowAI — Roadmap de Mejoras de Arquitectura

Documento de referencia para mejoras identificadas en el análisis de arquitectura.
Ordenado por prioridad. Hacer de a una a la vez.

---

## P0 — Crítico (rompe funcionalidad en producción)

### P0-A: Token refresh de Google OAuth
**Problema:** Los access tokens de Google expiran en ~1 hora. Sin refresh automático,
el usuario tiene que re-loguearse cada hora y todas las llamadas a Sheets fallan con `AUTH_REQUIRED`.

**Archivos a modificar:** `auth.ts`, `lib/sheets/client.ts`

**Solución:**
- En el `jwt` callback de `auth.ts`, guardar también `refresh_token` y `expires_at`
- Antes de retornar el token, verificar si expiró
- Si expiró, hacer POST a `https://oauth2.googleapis.com/token` con `grant_type: refresh_token`
- Actualizar `accessToken` y `expiresAt` en el JWT

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

**Esfuerzo estimado:** 2h

---

### P0-B: Context window management
**Problema:** El request al LLM envía TODO el historial sin truncar. Los tool results
con datos de sheets son enormes. Con conversaciones largas se excede el context window,
se pagan tokens innecesarios y se degrada la calidad de las respuestas.

**Archivos a modificar:** `app/api/ai/chat/route.ts`

**Solución:**
- Mantener siempre: system prompt + últimos N mensajes (sliding window)
- Compactar tool results viejos: después de que el AI ya respondió, el raw data no es necesario
- Reemplazar tool results de más de 2 turnos atrás con `[Datos ya procesados]`

```typescript
function compactOldToolResults(messages: Message[]): Message[] {
  const cutoff = messages.length - 6 // mantener últimos 3 turnos completos
  return messages.map((msg, i) => {
    if (i < cutoff && msg.role === 'tool') {
      return { ...msg, content: '[Datos de hoja ya procesados]' }
    }
    return msg
  })
}
```

**Esfuerzo estimado:** 4h

---

## P1 — Alta prioridad (mejoras significativas de calidad y DX)

### P1-A: Charts como tool dedicado (no fence blocks)
**Problema:** El parsing de ` ```chart ``` ` en el frontend es frágil. Un JSON malformado
rompe el parse, y durante streaming puede cortar el JSON a la mitad. Solución más elegante
y alineada con cómo funciona el Vercel AI SDK.

**Archivos a modificar:** `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`,
`components/chat/MessageBubble.tsx`, `hooks/use-chat.ts`

**Solución:**
- Agregar tool `render_chart` al route handler
- El AI llama a este tool con el spec Vega-Lite como objeto estructurado (no string)
- El frontend detecta tool calls de tipo `render_chart` y renderiza `<ChartMessage>`
- Eliminar la lógica de split por fence block

```typescript
// En route.ts
render_chart: tool({
  description: 'Renderizar un gráfico Vega-Lite con los datos analizados',
  parameters: z.object({
    spec: z.record(z.unknown()).describe('Vega-Lite v5 spec con datos inline'),
    title: z.string().optional(),
  }),
  execute: async ({ spec }) => ({ spec }), // pass-through, el frontend renderiza
})
```

**Ventajas adicionales:**
- El spec viene estructurado (no hay que parsear strings)
- El AI SDK maneja el streaming nativamente
- No hay false positives si el AI menciona "chart" en otro contexto

**Esfuerzo estimado:** 3h

---

### P1-B: Observabilidad — logging de uso del AI
**Problema:** No hay visibilidad de qué tools llama el AI, cuántos tokens consume cada
request, ni qué errores ocurren en producción. Sin esto es imposible mejorar el agente.

**Archivos a modificar:** `app/api/ai/chat/route.ts`

**Solución mínima (console.log estructurado):**

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

**Solución avanzada:** Integrar Langfuse (open source, free tier) para trazabilidad
completa de cada step del agente.

**Esfuerzo estimado:** 2h (básico) / 4h (Langfuse)

---

### P1-C: Inyectar tabs en system prompt (evitar re-descubrir en cada turno)
**Problema:** El system prompt le dice al AI que llame `list_available_tabs()` en cada
turno. Pero los tabs casi nunca cambian. Es un tool call innecesario que añade latencia.

**Archivos a modificar:** `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`

**Solución:**
- En el route handler, llamar `listTabs()` antes de `streamText()`
- Pasar la lista de tabs a `buildSystemPrompt({ availableTabs })`
- El AI recibe los tabs como contexto y va directo a `get_sheet_data`
- Mantener `list_available_tabs` como tool de fallback (por si el AI necesita re-descubrir)

```typescript
// route.ts
const availableTabs = await listTabs(accessToken)
const systemPrompt = buildSystemPrompt({ availableTabs })
```

**Esfuerzo estimado:** 1h

---

### P1-D: Refactor — mover lógica de API routes a `/lib/actions`
**Problema:** La lógica de negocio está mezclada dentro de los route handlers.
Dificulta el testing, reutilización, y la migración futura a Server Actions.
También es preparación necesaria para agregar persistencia con Neon DB.

**Estado actual:**
- `app/api/ai/chat/route.ts` — lógica de chat mezclada con HTTP handling
- `app/api/sheets/route.ts` — lógica de sheets mezclada con HTTP handling
- `app/chat/actions.ts` — ya usa Server Actions (bien)

**Propuesta de estructura:**

```
lib/
  actions/
    chat.ts        # lógica de chat: buildChatPayload, validateChatRequest
    sheets.ts      # lógica de sheets: fetchSheetData, formatForAI
    db/
      messages.ts  # CRUD de mensajes en Neon (preparación para persistencia)
      users.ts     # gestión de usuarios (preparación para multi-user)
```

**Reglas:**
- `lib/actions/` contiene lógica pura (no HTTP, no headers, no Response objects)
- Los route handlers y Server Actions son solo glue code que llaman a estas funciones
- Las funciones en `lib/actions/db/` son las que van a interactuar con Neon

**Ejemplo de migración:**

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
  // ... lógica de streamText
}

// app/api/ai/chat/route.ts (queda thin)
export async function POST(req: Request) {
  const session = await auth()
  // validación...
  return processChat({ messages, provider, model, accessToken: session.accessToken })
}
```

**Esfuerzo estimado:** 4h

---

## P2 — Media prioridad (mejoras importantes para producción)

### P2-A: Persistencia de mensajes con Neon DB
**Problema:** El historial de conversaciones solo vive en localStorage. Si el usuario
limpia el browser, pierde todo. No hay posibilidad de acceder desde otro dispositivo.

**Prerequisito:** P1-D (lib/actions/db/ debe existir primero)

**Stack propuesto:**
- Neon (PostgreSQL serverless, free tier generoso)
- Drizzle ORM (TypeScript-first, muy liviano, bien integrado con Next.js)

**Schema inicial:**

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
tool_calls      jsonb          -- tool calls del AI
metadata        jsonb          -- tokens usados, modelo, duración
created_at      timestamp default now()
```

**Archivos nuevos:**
- `lib/db/schema.ts` — Drizzle schema
- `lib/db/index.ts` — conexión a Neon
- `lib/actions/db/messages.ts` — `saveMessage()`, `getMessages()`, `clearConversation()`

**Variables de entorno a agregar:**
```
DATABASE_URL=postgres://...@neon.tech/cashflowai
```

**Esfuerzo estimado:** 6h

---

### P2-B: Memory entre sesiones (user profile)
**Problema:** El AI no recuerda metas, preferencias ni contexto personal entre sesiones.
Para un coach financiero, esto es crítico.

**Prerequisito:** P2-A (necesita DB para persistir)

**Solución:**
- Tabla `user_profiles` en Neon con campos: goals, context_notes, preferences
- Un tool `update_user_context` que el AI puede llamar cuando detecta info relevante
- Inyectar el perfil en el system prompt en cada conversación

**Esfuerzo estimado:** 4h (después de tener P2-A)

---

### P2-C: Rate limiting
**Problema:** No hay protección contra uso excesivo que queme las API keys.

**Archivos a modificar:** `app/api/ai/chat/route.ts`

**Solución mínima (in-memory, suficiente para single-user):**

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

**Esfuerzo estimado:** 1h

---

### P2-D: Validación de chart specs antes de renderizar
**Problema:** El spec Vega-Lite del AI se pasa directamente a vega-embed sin validar.
Un spec malformado puede causar errores de renderizado silenciosos o inesperados.

**Archivos a modificar:** `components/chat/ChartMessage.tsx`

**Solución:**
- Validar con Zod que el spec tiene al menos `$schema`, `mark`, `encoding`
- Si no es válido, mostrar el error descriptivo en lugar del chart vacío

**Esfuerzo estimado:** 2h

---

## P3 — Baja prioridad (optimizaciones y escalabilidad futura)

### P3-A: Cache persistente con Upstash Redis
**Problema:** El cache in-memory de sheets no sobrevive en entornos serverless (Vercel)
porque cada request puede ir a una instancia diferente.

**Solución:**
- Reemplazar el `Map` con `unstable_cache` de Next.js (solución simple, built-in)
- O usar Upstash Redis (free tier) para cache distribuido real

**Esfuerzo estimado:** 2h

---

### P3-B: Tool routing / sub-agents para escalabilidad
**Problema:** Hoy hay 3 tools. Cuando se agreguen features (presupuestos, metas, alertas),
la lista crece y el AI se confunde sobre cuál usar.

**Patrón propuesto:**

```
User Message
    ↓
Router Agent (decide capability)
    ├── Sheet Analysis Agent (tools: get_data, list_tabs)
    ├── Chart Agent (tool: render_chart)
    ├── Goals Agent (tools: get_goals, set_goal)    [futuro]
    └── Budget Agent (tools: get_budget, set_budget) [futuro]
```

**Esfuerzo estimado:** 8h+ (diseño + implementación)

---

## Orden de ejecución sugerido

```
P0-A → P0-B → P1-C → P1-A → P1-D → P1-B → P2-C → P2-A → P2-B → P2-D → P3-A → P3-B
```

Lógica:
1. Primero estabilizar lo que ya existe (P0)
2. Mejorar la arquitectura del agente (P1)
3. Agregar persistencia una vez que la arquitectura esté limpia (P2)
4. Optimizaciones finales (P3)

---

*Última actualización: 2026-03-25*
