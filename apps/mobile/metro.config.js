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

module.exports = config
