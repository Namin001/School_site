import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import crypto from 'crypto'

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

// Robust error logging utility for application errors
export function logError(error: any) {
  try {
    const logDir = path.join(process.cwd(), 'prisma');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    fs.appendFileSync(logPath, `[${timestamp}] ${errorMessage}\n\n`);
  } catch (e) {
    console.error('Failed to write to error log:', e);
  }
}

// Auto-initialize SQLite database and sync schema modifications
if (databaseUrl.startsWith('file:')) {
  const dbPath = databaseUrl.substring(5);
  const dbExists = fs.existsSync(dbPath);
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const hashFilePath = path.join(process.cwd(), 'prisma', '.schema_pushed_hash');
  const dbInitLogPath = path.join(process.cwd(), 'prisma', 'db_init.log');

  let schemaHash = '';
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    schemaHash = crypto.createHash('md5').update(schemaContent).digest('hex');
  }

  let hashMatches = false;
  if (fs.existsSync(hashFilePath)) {
    const savedHash = fs.readFileSync(hashFilePath, 'utf8').trim();
    hashMatches = (savedHash === schemaHash);
  }

  const needsPush = !dbExists || !hashMatches;

  const logMsg = (msg: string) => {
    try {
      const timestamp = new Date().toISOString();
      const formatted = `[${timestamp}] ${msg}\n`;
      fs.appendFileSync(dbInitLogPath, formatted);
    } catch (e) {}
    console.log(msg);
  };

  if (needsPush) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      logMsg(`[Database] Creating missing parent directory: ${dbDir}`);
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (err: any) {
        logMsg(`[Database] Failed to create directory ${dbDir}: ${err.message}`);
      }
    }
    logMsg(`[Database] File exists: ${dbExists}, Schema hash matches: ${hashMatches}. Auto-initializing/updating SQLite database...`);
    // Find local prisma CLI path dynamically at runtime without require.resolve (which Webpack resolves statically at build time)
    let localPrismaCli = '';
    const searchDirs = [process.cwd()];
    try {
      if (typeof __dirname !== 'undefined') {
        searchDirs.push(__dirname);
      }
    } catch (e) {}

    for (const startDir of searchDirs) {
      let current = path.resolve(startDir);
      for (let i = 0; i < 10; i++) {
        const checkPath = path.join(current, 'node_modules', 'prisma', 'build', 'index.js');
        if (fs.existsSync(checkPath)) {
          localPrismaCli = checkPath;
          break;
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
      if (localPrismaCli) break;
    }

    // Resolve npx command path relative to the running node executable as a fallback
    let npxCommand = 'npx';
    try {
      const nodeBinDir = path.dirname(process.execPath);
      const possibleNpx = path.join(nodeBinDir, 'npx');
      if (fs.existsSync(possibleNpx)) {
        npxCommand = `"${possibleNpx}"`;
      } else if (fs.existsSync(possibleNpx + '.cmd')) {
        npxCommand = `"${possibleNpx}.cmd"`;
      }
    } catch (e) {}

    const useLocalPrisma = !!localPrismaCli;
    const runCommand = useLocalPrisma
      ? `node "${localPrismaCli}" db push --accept-data-loss`
      : `${npxCommand} prisma db push --accept-data-loss`;

    logMsg(`[Database] Executing command: "${runCommand}"`);

    try {
      const pushOutput = execSync(runCommand, {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8'
      });
      logMsg(`[Database] Schema push succeeded:\n${pushOutput}`);

      if (schemaHash) {
        fs.writeFileSync(hashFilePath, schemaHash, 'utf8');
        logMsg(`[Database] Updated schema hash file with: ${schemaHash}`);
      }

      // Seed if the database was just created
      if (!dbExists) {
        const seedPath = path.join(process.cwd(), 'prisma', 'seed.js');
        if (fs.existsSync(seedPath)) {
          logMsg(`[Database] Seeding database...`);
          const seedOutput = execSync('node prisma/seed.js', {
            env: { ...process.env, DATABASE_URL: databaseUrl },
            encoding: 'utf8'
          });
          logMsg(`[Database] Seeding completed:\n${seedOutput}`);
        } else {
          logMsg(`[Database] Seed script not found at ${seedPath}`);
        }
      }
    } catch (err: any) {
      const errStdout = err.stdout ? String(err.stdout) : '';
      const errStderr = err.stderr ? String(err.stderr) : '';
      const errMsg = `[Database] Schema push/seeding failed!\nError: ${err.message}\nStdout: ${errStdout}\nStderr: ${errStderr}`;
      logMsg(errMsg);
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


