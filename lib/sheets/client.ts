import { auth } from '@/auth'
import { google } from 'googleapis'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const tabDataCache = new Map<string, { data: string[][]; ts: number }>()
let tabListCache: { tabs: string[]; ts: number } | null = null

export function clearCache(tab?: string) {
  if (tab) {
    tabDataCache.delete(tab)
  } else {
    tabDataCache.clear()
    tabListCache = null
  }
}

async function getSheetsClient() {
  const session = await auth()
  if (!session?.accessToken) {
    throw new Error('No hay sesión activa o el token de acceso expiró. Por favor, inicia sesión nuevamente.')
  }
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session.accessToken })
  return google.sheets({ version: 'v4', auth: oauth2Client })
}

export async function listTabs(filter?: string): Promise<string[]> {
  const now = Date.now()

  if (!tabListCache || now - tabListCache.ts >= CACHE_TTL_MS) {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      })

      const tabs = (response.data.sheets ?? [])
        .map((s) => s.properties?.title ?? '')
        .filter(Boolean)

      tabListCache = { tabs, ts: now }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Error al obtener la lista de hojas del spreadsheet: ${message}`)
    }
  }

  const allTabs = tabListCache.tabs
  if (!filter) return allTabs

  const lowerFilter = filter.toLowerCase()
  return allTabs.filter((t) => t.toLowerCase().includes(lowerFilter))
}

function findSimilarTabs(name: string, available: string[]): string[] {
  const lower = name.toLowerCase()
  return available.filter((t) => {
    const tLower = t.toLowerCase()
    return tLower.includes(lower) || lower.includes(tLower)
  })
}

async function getTab(tab: string, refresh = false): Promise<string[][]> {
  const now = Date.now()
  const cached = tabDataCache.get(tab)

  if (!refresh && cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: tab,
    })

    const data = (response.data.values ?? []) as string[][]
    tabDataCache.set(tab, { data, ts: now })
    return data
  } catch (err: unknown) {
    const isNotFound =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 400

    if (isNotFound) {
      const available = await listTabs()
      const similar = findSimilarTabs(tab, available)
      const suggestion =
        similar.length > 0 ? ` Did you mean: ${similar.map((t) => `'${t}'`).join(', ')}?` : ''
      throw new Error(
        `Tab '${tab}' not found. Available tabs: ${JSON.stringify(available)}.${suggestion}`,
      )
    }
    throw err
  }
}

export async function loadTabs(
  tabs: string[],
  refresh = false,
): Promise<Record<string, string[][] | { error: string }>> {
  const results = await Promise.allSettled(tabs.map((tab) => getTab(tab, refresh)))
  return Object.fromEntries(
    tabs.map((tab, i) => {
      const result = results[i]
      return [
        tab,
        result.status === 'fulfilled' ? result.value : { error: (result.reason as Error).message },
      ]
    }),
  )
}
