const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Svm2003@123', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hash,
    },
    create: {
      username: 'admin',
      password: hash,
      role: 'ADMIN',
    },
  });

  // Create Teacher
  const teacherHash = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      password: teacherHash,
      role: 'TEACHER',
      name: 'John Doe',
      className: 'Class 10-A'
    },
  });

  // Create initial contents
  const pages = ['home', 'about', 'newsletter'];
  for (const page of pages) {
    await prisma.content.upsert({
      where: { pageId: page },
      update: {},
      create: {
        pageId: page,
        content: `Welcome to ${page.charAt(0).toUpperCase() + page.slice(1)}.\n\nThis is the default content for the ${page} page. The Admin can edit this text.`,
      },
    });
  }

  // Get Admin
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });

  // Create 12 Groups
  const groupNames = [
    'General Announcements',
    'Class 10-A Parent Group',
    'Teacher Lounge',
    'STEM Club',
    'Sports Committee',
    'Arts & Culture',
    'Parent-Teacher Association',
    'School Infrastructure',
    'Exam Schedule',
    'Lost & Found',
    'Library Media Center',
    'Student Council'
  ];

  for (const name of groupNames) {
    const group = await prisma.group.create({
      data: {
        name,
        description: `Official group for ${name}`,
        createdById: admin.id,
      }
    });

    // Add admin and teacher to some groups
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: admin.id,
        role: 'ADMIN'
      }
    });

    if (name.includes('Teacher') || name.includes('10-A') || name === 'General Announcements') {
        await prisma.groupMember.create({
            data: {
                groupId: group.id,
                userId: teacher.id,
                role: 'MEMBER'
            }
        });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
