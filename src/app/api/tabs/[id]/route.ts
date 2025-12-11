import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, icon, color, description } = await request.json()
    const { id } = params

    const tab = await db.tab.update({
      where: { id },
      data: {
        name,
        icon,
        color,
        description
      }
    })

    return NextResponse.json(tab)
  } catch (error) {
    console.error('Error updating tab:', error)
    return NextResponse.json({ error: 'Failed to update tab' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    await db.tab.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tab:', error)
    return NextResponse.json({ error: 'Failed to delete tab' }, { status: 500 })
  }
}