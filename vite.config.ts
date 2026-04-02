import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Serve kuromoji dict files as raw binary (application/octet-stream) with no
// Content-Encoding. Vite/sirv automatically sets Content-Encoding: gzip for
// .gz files, which causes the browser to decompress them before kuromoji sees
// them — breaking kuromoji's own decompression step.
function dictBinaryPlugin() {
  return {
    name: 'dict-binary',
    configureServer(server) {
      server.middlewares.use('/dict', (req, res, next) => {
        const filename = req.url?.replace(/^\//, '') ?? ''
        if (!filename.endsWith('.dat.gz')) return next()
        try {
          const filepath = resolve('public/dict', filename)
          const data = readFileSync(filepath)
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.length,
            'Cache-Control': 'public, max-age=31536000, immutable',
          })
          res.end(data)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cloudflare(), dictBinaryPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
