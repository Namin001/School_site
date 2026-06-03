import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'NEWSLETTER'

  try {
    // Try Prisma Client first
    try {
      if ((prisma as any).post) {
        const posts = await (prisma as any).post.findMany({
          where: { type },
          orderBy: [
            { order: 'asc' },
            { createdAt: 'desc' }
          ]
        })
        return NextResponse.json(posts)
      }
    } catch (prismaErr) {
      console.warn("Prisma Client findMany failed, likely out of sync. Falling back to RAW SQL.", prismaErr)
    }

    // Fallback to RAW SQL if Prisma Client fails or is out of sync
    const posts = await prisma.$queryRawUnsafe(
      `SELECT * FROM Post WHERE type = ? ORDER BY [order] ASC, createdAt DESC`,
      type
    )
    return NextResponse.json(posts)
    
  } catch (err: any) {
    console.error("Critical DB Error:", err)
    return NextResponse.json({ error: 'DB Error', details: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    const subject = formData.get('subject') as string
    const content = formData.get('content') as string
    const type = (formData.get('type') as string) || 'NEWSLETTER'
    const image = formData.get('image') as File
    const additionalImages = formData.getAll('additionalImages') as File[]
    const video = formData.get('video') as File

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and Content are required' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads/posts')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {}

    let imagePath = ''
    if (image && image.size > 0) {
      const filename = `post_${Date.now()}_${image.name.replace(/\s+/g, '_')}`
      const bytes = await image.arrayBuffer()
      await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
      imagePath = `/uploads/posts/${filename}`
    }

    let additionalImagePaths: string[] = []
    for (const img of additionalImages) {
      if (img && img.size > 0) {
        const filename = `post_extra_${Date.now()}_${Math.random().toString(36).substring(7)}_${img.name.replace(/\s+/g, '_')}`
        const bytes = await img.arrayBuffer()
        await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
        additionalImagePaths.push(`/uploads/posts/${filename}`)
      }
    }

    let videoPath = ''
    if (video && video.size > 0) {
      const filename = `post_video_${Date.now()}_${video.name.replace(/\s+/g, '_')}`
      const bytes = await video.arrayBuffer()
      await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
      videoPath = `/uploads/posts/${filename}`
    }

    const additionalImagesJson = additionalImagePaths.length > 0 ? JSON.stringify(additionalImagePaths) : null

    try {
      if ((prisma as any).post) {
        const post = await (prisma as any).post.create({
          data: { 
            title, 
            subject, 
            content, 
            type, 
            imagePath, 
            additionalImages: additionalImagesJson,
            videoPath,
            order: 0
          }
        })
        return NextResponse.json(post)
      }
    } catch (e) {
      console.warn("Prisma Client create failed, falling back to RAW SQL")
    }

    // Fallback to RAW SQL
    const id = `cl${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `INSERT INTO Post (id, title, subject, content, type, imagePath, additionalImages, videoPath, createdAt, updatedAt, [order]) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, title, subject, content, type, imagePath, additionalImagesJson, videoPath, now, now, 0
    )
    return NextResponse.json({ id, title, subject, content, type, imagePath, additionalImages: additionalImagesJson, videoPath })
  } catch (error: any) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { orders } = body // Expecting { orders: [{ id: '...', order: 0 }, ...] }

        if (!orders || !Array.isArray(orders)) {
            return NextResponse.json({ error: 'Invalid orders' }, { status: 400 })
        }

        for (const item of orders) {
            try {
                try {
                    if ((prisma as any).post) {
                        await (prisma as any).post.update({
                            where: { id: item.id },
                            data: { order: item.order }
                        })
                        continue;
                    }
                } catch (e) {}

                await prisma.$executeRawUnsafe(
                    `UPDATE Post SET [order] = ? WHERE id = ?`,
                    item.order, item.id
                )
            } catch (e) {
                console.error(`Failed to update order for post ${item.id}:`, e)
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Update Error', details: err.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    try {
      if ((prisma as any).post) {
        await (prisma as any).post.delete({ where: { id } })
        return NextResponse.json({ success: true })
      }
    } catch (e) {
        console.warn("Prisma Client delete failed, falling back to RAW SQL")
    }
    
    // Fallback to RAW SQL
    await prisma.$executeRawUnsafe(`DELETE FROM Post WHERE id = ?`, id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete', details: error.message }, { status: 500 })
  }
}
