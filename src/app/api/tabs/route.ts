import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tabs = await db.tab.findMany({
      orderBy: { position: 'asc' }
    })
    return NextResponse.json(tabs)
  } catch (error) {
    console.error('Error fetching tabs:', error)
    return NextResponse.json({ error: 'Failed to fetch tabs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, icon, color, description } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get the highest position to append at the end
    const lastTab = await db.tab.findFirst({
      orderBy: { position: 'desc' }
    })
    
    const newPosition = lastTab ? lastTab.position + 1 : 0

    const tab = await db.tab.create({
      data: {
        name,
        icon: icon || 'Code',
        color: color || 'bg-blue-500',
        description,
        position: newPosition
      }
    })

    return NextResponse.json(tab, { status: 201 })
  } catch (error) {
    console.error('Error creating tab:', error)
    return NextResponse.json({ error: 'Failed to create tab' }, { status: 500 })
  }
}