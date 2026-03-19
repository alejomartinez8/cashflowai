import { auth } from '@/auth'
import { google } from 'googleapis'
import type { TabName } from '@/lib/types'

const TABS = ['2025', '2024', '2023', 'Proyecciones', 'Balance', 'New Home', 'Deudas Banco', 'Prestamos'] as const

async function getSheetsClient() {
  const session = await auth()
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session?.accessToken })
  return google.sheets({ version: 'v4', auth: oauth2Client })
}

async function getTab(tab: TabName): Promise<string[][]> {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tab,
  })

  return (response.data.values ?? []) as string[][]
}

export async function loadTabs(tabs: TabName[]): Promise<Record<TabName, string[][]>> {
  const results = await Promise.all(tabs.map((tab) => getTab(tab)))
  return Object.fromEntries(tabs.map((tab, i) => [tab, results[i]])) as Record<TabName, string[][]>
}

export { TABS }
export type { TabName }
