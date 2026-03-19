import { auth } from '@/auth'
import { loadTabs, clearCache, TABS } from '@/lib/sheets/client'
import type { TabName } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const tabsParam = searchParams.get('tabs')
  const refresh = searchParams.get('refresh') === 'true'

  const requestedTabs = tabsParam
    ? tabsParam.split(',').map((t) => t.trim()).filter((t) => TABS.includes(t as TabName)) as TabName[]
    : []

  if (requestedTabs.length === 0) {
    return NextResponse.json(
      { error: `No valid tabs requested. Available: ${TABS.join(', ')}` },
      { status: 400 }
    )
  }

  if (refresh) {
    requestedTabs.forEach((tab) => clearCache(tab))
  }

  const data = await loadTabs(requestedTabs, refresh)
  return NextResponse.json(data)
}
