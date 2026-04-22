// Re-export the shared Tamagui config from the mobile app. The tokens and
// themes are the single source of truth for both platforms — they live in
// apps/mobile/tamagui.config.ts (closest to the design tokens for native)
// and this file just routes them to the web build.
export { default } from '../mobile/tamagui.config'
