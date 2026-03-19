# CashflowAI

An AI-powered personal financial assistant. Chat in natural language with an AI that has direct access to your Google Sheets financial data and generates dynamic charts on demand.

## How it works

1. You ask a question or request a chart in natural language
2. The AI decides which Google Sheets tabs it needs and fetches them via the `get_sheet_data` tool
3. The AI analyzes the raw data and responds with text + an optional Vega-Lite chart
4. The chart is rendered dynamically in the browser — no fixed parsers, no hardcoded visualizations

## Stack

- **Next.js 16** — App Router, Route Handlers
- **NextAuth.js v5** — Google OAuth; the same access token is reused for the Sheets API
- **Vercel AI SDK** — multi-provider streaming (Anthropic, OpenAI, Google)
- **Google Sheets API v4** — single source of truth, no database
- **Tailwind CSS + shadcn/ui** — UI
- **react-vega** — renders Vega-Lite specs as charts

## Getting started

```bash
cp .env.local.example .env.local
# fill in the required values (see below)

yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_SHEETS_ID` | ID of the Google Sheet to use |
| `ALLOWED_EMAIL` | Only this email address can log in |
| `AUTH_SECRET` | NextAuth secret — generate with `npx auth secret` |
| `AI_PROVIDER` | `anthropic` (default), `openai`, or `google` |
| `AI_MODEL` | Model name — default `claude-sonnet-4-5` |
| `ANTHROPIC_API_KEY` | Required if `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | Required if `AI_PROVIDER=openai` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Required if `AI_PROVIDER=google` |

## Commands

```bash
yarn dev      # development server
yarn build    # production build
yarn lint     # ESLint
```
