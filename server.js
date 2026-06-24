const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

// Manually load environment variables from .env if present (vanilla Node doesn't do this)
try {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          let val = parts.slice(1).join('=').trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1)
          }
          if (!process.env[key]) {
            process.env[key] = val
            console.log(`[Env] Loaded variable: ${key}`)
          }
        }
      }
    })
  }
} catch (e) {
  console.error('[Env] Error reading .env file:', e)
}

// Hostinger environment is set to production
const dev = process.env.NODE_ENV !== 'production'

if (!dev) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl && databaseUrl.startsWith('file:')) {
      const dbFilePath = databaseUrl.substring(5)
      const dbDir = path.dirname(dbFilePath)
      if (!fs.existsSync(dbDir)) {
        console.log(`[Database] Creating directory: ${dbDir}`)
        fs.mkdirSync(dbDir, { recursive: true })
      }
    }

    let localPrismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
    const useLocalPrisma = fs.existsSync(localPrismaCli)

    const runPrisma = (args) => {
      const cmd = useLocalPrisma ? `node "${localPrismaCli}" ${args}` : `npx prisma ${args}`
      console.log(`[Prisma Startup] Running: ${cmd}`)
      execSync(cmd, { stdio: 'inherit', env: process.env })
    }

    runPrisma('generate')
    runPrisma('db push')
    console.log('[Prisma Startup] Setup completed successfully.')
  } catch (err) {
    console.error('[Prisma Startup] Failed to initialize Prisma automatically:', err)
  }
}


const app = next({ dev })
const handle = app.getRequestHandler()

const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on port ${port}`)
  })
})
