import { auth } from '@/auth'
import { loadTabs, listTabs } from '@/lib/sheets/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tabsParam = req.nextUrl.searchParams.get('tabs')
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'

  if (!tabsParam) {
    try {
      const available = await listTabs()
      return NextResponse.json(
        { error: `No tabs requested. Available: ${available.join(', ')}` },
        { status: 400 },
      )
    } catch (err) {
      console.error('[sheets] Error al listar hojas:', err)
      const message = err instanceof Error ? err.message : 'Error desconocido'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const requestedTabs = tabsParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  try {
    const data = await loadTabs(requestedTabs, refresh)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[sheets] Error al cargar hojas:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
