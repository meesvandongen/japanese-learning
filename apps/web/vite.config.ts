import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

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

function getGitDate(): string {
  try {
    const iso = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim()
    return iso.slice(0, 10) // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export default defineConfig({
  define: {
    __GIT_DATE__: JSON.stringify(getGitDate()),
    // Tamagui reads these at runtime; without them the optimizing compiler
    // keeps unused theme branches and bundle size balloons.
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  // Match Metro's extension ordering so `.web.ts` wins for web builds and
  // falls back to `.ts` otherwise. Metro on native uses `.native.ts` itself.
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    // Tamagui's primitives import from 'react-native'; on web that has to be
    // aliased to react-native-web. Same trick Expo's Metro config uses when
    // emitting web output — but Vite needs an explicit alias entry.
    alias: {
      'react-native': 'react-native-web',
    },
  },
  optimizeDeps: {
    // sqlite-wasm ships its own ESM + worker; don't prebundle it, the worker
    // loader needs the original module layout to find its assets.
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  plugins: [react(), cloudflare(), dictBinaryPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '../../packages/core/src/**/*.test.ts'],
  },
})
