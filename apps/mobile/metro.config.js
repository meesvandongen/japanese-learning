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

// Bundle the SQLite vocab database as a raw binary asset. The kuromoji
// dict files are inlined as base64 strings in JS (packages/core/src/
// tokenizer/dict-data/) so they don't need an asset extension entry.
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'db',
]
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
]

module.exports = config
