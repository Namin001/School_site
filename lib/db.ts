import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

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

// Auto-initialize SQLite database if it's missing (e.g. first deploy on Hostinger)
if (databaseUrl.startsWith('file:')) {
  const dbPath = databaseUrl.substring(5);
  if (!fs.existsSync(dbPath)) {
    console.log(`[Database] File not found at ${dbPath}. Auto-initializing SQLite...`);
    try {
      // Create schema and tables
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      // Run database seeding for default admin and initial groups
      const seedPath = path.join(process.cwd(), 'prisma', 'seed.js');
      if (fs.existsSync(seedPath)) {
        execSync('node prisma/seed.js', { stdio: 'inherit' });
      }
      console.log('[Database] SQLite database initialized and seeded successfully.');
    } catch (err) {
      console.error('[Database] Failed to auto-initialize SQLite database:', err);
    }
  }
}

export const prisma = globalForPrisma.prisma ?? (() => {
  process.env.DATABASE_URL = databaseUrl;
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
})()


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


