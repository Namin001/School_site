import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const CLASS_OPTIONS = [
  'LKG', 'UKG', 'I- std A', 'I-std B', 'II- std A', 'II-std B', 'III- std A', 'III-std B', 
  'IV- std A', 'IV-std B', 'V- std A', 'V-std B', 'VI- std A', 'VI-std B', 'VII- std A', 
  'VII-std B', 'VIII- std A', 'VIII-std B', 'IX- std A', 'IX-std B', 'X- std A', 'X-std B', 
  'XI- 1st', 'XI-2nd', 'XI-3rd', 'XI-4th', 'XII- 1st', 'XII-2nd', 'XII-3rd', 'XII-4th'
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const classes = await prisma.class.findMany({
      orderBy: { id: 'asc' }
    });
    
    // Sort classes based on CLASS_OPTIONS order
    const sortedClasses = classes.sort((a: any, b: any) => {
      const idxA = CLASS_OPTIONS.indexOf(a.name);
      const idxB = CLASS_OPTIONS.indexOf(b.name);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    // For each class, fetch stats
    const users = await prisma.user.findMany({
      where: { role: { in: ['PARENT', 'TEACHER'] } }
    });

    const classStats = sortedClasses.map((cls: any) => {
      const students = users.filter((u: any) => u.className === cls.name && u.role === 'PARENT').length;
      const teachers = users.filter((u: any) => u.className === cls.name && u.role === 'TEACHER').length;
      
      return {
        ...cls,
        studentsCount: students,
        teachersCount: teachers
      };
    });

    return NextResponse.json(classStats);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { className, defaultFees } = await request.json();

    if (!className || defaultFees === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedClass = await prisma.class.upsert({
      where: { name: className },
      update: { defaultFees: parseInt(defaultFees) || 0 },
      create: { name: className, defaultFees: parseInt(defaultFees) || 0 }
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
