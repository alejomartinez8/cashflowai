import { auth } from '@/auth'
import { google } from 'googleapis'
import type { TabName } from '@/lib/types'

const TABS = ['2025', '2024', '2023', 'Proyecciones', 'Balance', 'New Home', 'Deudas Banco', 'Prestamos'] as const

// Per-tab in-memory cache — 5-minute TTL, no external library
interface CacheEntry {
  data: string[][]
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60 * 1000

function getCached(tab: string): string[][] | null {
  const entry = cache.get(tab)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(tab)
    return null
  }
  return entry.data
}

function setCached(tab: string, data: string[][]): void {
  cache.set(tab, { data, expiresAt: Date.now() + TTL_MS })
}

export function clearCache(tab?: string): void {
  if (tab) cache.delete(tab)
  else cache.clear()
}

async function getSheetsClient() {
  const session = await auth()
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session?.accessToken })
  return google.sheets({ version: 'v4', auth: oauth2Client })
}

async function getTab(tab: TabName, refresh = false): Promise<string[][]> {
  if (!refresh) {
    const cached = getCached(tab)
    if (cached) return cached
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tab,
  })

  const data = (response.data.values ?? []) as string[][]
  setCached(tab, data)
  return data
}

export async function loadTabs(
  tabs: TabName[],
  refresh = false
): Promise<Record<TabName, string[][]>> {
  const results = await Promise.all(tabs.map((tab) => getTab(tab, refresh)))
  return Object.fromEntries(tabs.map((tab, i) => [tab, results[i]])) as Record<TabName, string[][]>
}

export { TABS }
export type { TabName }
