import { auth } from '@/auth'
import { google } from 'googleapis'
import { TABS, type TabName } from '@/lib/types'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const cache = new Map<TabName, { data: string[][]; ts: number }>()

export function clearCache(tab?: TabName) {
  if (tab) {
    cache.delete(tab)
  } else {
    cache.clear()
  }
}

async function getSheetsClient() {
  const session = await auth()
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session?.accessToken })
  return google.sheets({ version: 'v4', auth: oauth2Client })
}

async function getTab(tab: TabName, refresh = false): Promise<string[][]> {
  const now = Date.now()
  const cached = cache.get(tab)

  if (!refresh && cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tab,
  })

  const data = (response.data.values ?? []) as string[][]
  cache.set(tab, { data, ts: now })
  return data
}

export async function loadTabs(tabs: TabName[], refresh = false): Promise<Record<TabName, string[][]>> {
  const results = await Promise.all(tabs.map((tab) => getTab(tab, refresh)))
  return Object.fromEntries(tabs.map((tab, i) => [tab, results[i]])) as Record<TabName, string[][]>
}

export { TABS }
export type { TabName }
