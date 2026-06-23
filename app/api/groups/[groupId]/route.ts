import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { groupId } = await params;

  try {
    if ((prisma as any).group) {
      const group = await (prisma as any).group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            select: { userId: true }
          }
        }
      });

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      return NextResponse.json({
        id: group.id,
        name: group.name,
        description: group.description,
        memberIds: group.members.map((m: any) => m.userId)
      });
    } else {
      // Fallback to RAW SQL
      const groups: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "Group" WHERE id = ? LIMIT 1`,
        groupId
      );

      if (groups.length === 0) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      const members: any[] = await prisma.$queryRawUnsafe(
        `SELECT userId FROM GroupMember WHERE groupId = ?`,
        groupId
      );

      return NextResponse.json({
        id: groups[0].id,
        name: groups[0].name,
        description: groups[0].description,
        memberIds: members.map((m: any) => m.userId)
      });
    }
  } catch (error: any) {
    console.error('Group GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch group', details: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { groupId } = await params;

  try {
    const { name, description, memberIds } = await request.json()

    if ((prisma as any).group) {
        // Deduplicate and ensure creator is not added twice
        const uniqueMemberIds = Array.from(new Set([
            ...(memberIds || []).filter((id: string) => id !== session.id)
        ]));

        // Using a transaction to ensure atomic update of group and memberships
        await prisma.$transaction(async (tx: any) => {
            await tx.group.update({
                where: { id: groupId },
                data: { name, description }
            });

            // Delete old memberships and recreate (excluding creator if managed separately)
            // But usually easier to just upsert correctly or wipe and recreate if it's a simple list
            await tx.groupMember.deleteMany({
                where: { groupId, userId: { not: session.id } }
            });

            await tx.groupMember.createMany({
                data: uniqueMemberIds.map((userId: string) => ({
                    groupId,
                    userId,
                    role: 'MEMBER'
                }))
            });
        });

        return NextResponse.json({ success: true });
    } else {
        // Fallback to RAW SQL
        await prisma.$executeRawUnsafe(
            `UPDATE "Group" SET name = ?, description = ? WHERE id = ?`,
            name, description || '', groupId
        );

        // Delete other members
        await prisma.$executeRawUnsafe(
            `DELETE FROM GroupMember WHERE groupId = ? AND userId != ?`,
            groupId, session.id
        );

        // Insert new members
        for (const userId of (memberIds || [])) {
            if (userId === session.id) continue;
            await prisma.$executeRawUnsafe(
                `INSERT OR IGNORE INTO GroupMember (id, groupId, userId, role) VALUES (?, ?, ?, ?)`,
                `cl${Math.random().toString(36).substring(2, 11)}`, groupId, userId, 'MEMBER'
            );
        }

        return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('Group PUT error:', error);
    return NextResponse.json({ error: 'Failed to update group', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { groupId } = await params;

  try {
    if ((prisma as any).group) {
        await prisma.group.delete({ where: { id: groupId } });
        return NextResponse.json({ success: true });
    } else {
        // Fallback to RAW SQL
        await prisma.$executeRawUnsafe(`DELETE FROM Message WHERE groupId = ?`, groupId);
        await prisma.$executeRawUnsafe(`DELETE FROM GroupMember WHERE groupId = ?`, groupId);
        await prisma.$executeRawUnsafe(`DELETE FROM "Group" WHERE id = ?`, groupId);
        return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('Group DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete group', details: error.message }, { status: 500 })
  }
}
