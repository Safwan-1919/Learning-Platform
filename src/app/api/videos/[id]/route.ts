import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock user ID - in real app this would come from authentication
const MOCK_USER_ID = 'user_1'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { userId, isCompleted } = await request.json()

    if (!userId || isCompleted === undefined) {
      return NextResponse.json({ error: 'User ID and completion status are required' }, { status: 400 })
    }
    
    // Ensure mock user exists for development
    if (userId === MOCK_USER_ID) {
      const mockUser = await db.user.findUnique({ where: { id: MOCK_USER_ID }})
      if (!mockUser) {
        await db.user.create({
          data: {
            id: MOCK_USER_ID,
            email: 'mock.user@example.com',
            name: 'Mock User'
          }
        })
      }
    }

    // First, try to find existing progress
    const existingProgress = await db.videoProgress.findFirst({
      where: {
        userId,
        videoId: id
      }
    })

    if (existingProgress) {
      // Update existing progress
      const progress = await db.videoProgress.update({
        where: {
          id: existingProgress.id
        },
        data: {
          isCompleted,
          watchedAt: isCompleted ? new Date() : null
        }
      })

      return NextResponse.json(progress)
    } else {
      // Create new progress record
      const progress = await db.videoProgress.create({
        data: {
          userId,
          videoId: id,
          isCompleted,
          watchedAt: isCompleted ? new Date() : null
        }
      })

      return NextResponse.json(progress)
    }
  } catch (error) {
    console.error('Error updating video progress:', error)
    return NextResponse.json({ error: 'Failed to update video progress' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // First delete any progress records for this video
    await db.videoProgress.deleteMany({
      where: {
        videoId: id
      }
    })

    // Then delete the video itself
    await db.video.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}