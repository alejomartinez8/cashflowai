import { auth } from '@/auth'
import { loadTabs, TABS } from '@/lib/sheets/client'
import type { TabName } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tabsParam = req.nextUrl.searchParams.get('tabs')
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'

  const requestedTabs = tabsParam
    ? tabsParam.split(',').map((t) => t.trim()).filter((t) => TABS.includes(t as TabName)) as TabName[]
    : []

  if (requestedTabs.length === 0) {
    return NextResponse.json(
      { error: `No valid tabs requested. Available: ${TABS.join(', ')}` },
      { status: 400 }
    )
  }

  const data = await loadTabs(requestedTabs, refresh)
  return NextResponse.json(data)
}
