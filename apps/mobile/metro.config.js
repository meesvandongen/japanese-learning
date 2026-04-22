// Metro config for the Expo monorepo.
//
// The defaults don't look past apps/mobile/node_modules, so we add the root
// node_modules + packages/core to `watchFolders` and disable the
// hoist-blocking symlink traversal.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

// Treat `.dat.gz` dict files and `.db` files as binary assets bundled into
// the app. Without this, Metro tries to parse them as JS.
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'dat.gz',
  'gz',
  'db',
]
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
]

// For web: serve the contents of apps/mobile/public at /… so fetch('/dict/...')
// and fetch('/vocab.db') hit the files. Metro's static server picks up
// `publicPath`-anchored files at dev time; at export time, everything under
// public/ is copied into the emitted `dist/` directory.
config.server = {
  ...config.server,
  // enhanceMiddleware handles dev-time requests for /dict/*. Without this,
  // Metro serves .dat.gz with Content-Encoding: gzip which kuromoji then
  // tries to decompress a second time and fails.
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/dict/') && req.url.endsWith('.dat.gz')) {
        const fs = require('fs')
        const filename = req.url.replace(/^\/dict\//, '')
        const filepath = path.join(projectRoot, 'public', 'dict', filename)
        try {
          const data = fs.readFileSync(filepath)
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.length,
            'Cache-Control': 'public, max-age=31536000, immutable',
          })
          res.end(data)
          return
        } catch { /* fall through */ }
      }
      return middleware(req, res, next)
    }
  },
}

module.exports = config
