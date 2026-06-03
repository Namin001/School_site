import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  databaseUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
} else if (databaseUrl.startsWith('file:')) {
  const filePath = databaseUrl.substring(5);
  if (!path.isAbsolute(filePath) && !filePath.startsWith('/') && !filePath.startsWith('\\')) {
    if (filePath === './dev.db' || filePath === 'dev.db') {
      databaseUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
    } else {
      databaseUrl = `file:${path.resolve(process.cwd(), filePath)}`;
    }
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

