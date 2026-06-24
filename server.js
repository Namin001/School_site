const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { execSync } = require('child_process')

// Hostinger environment is set to production
const dev = process.env.NODE_ENV !== 'production'

if (!dev) {
  try {
    console.log('Automatic Hostinger Startup: Running Prisma generate & DB push...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('Prisma setup completed successfully.');
  } catch (err) {
    console.error('Failed to initialize Prisma automatically:', err);
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
