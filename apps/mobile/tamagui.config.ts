import { createTamagui } from 'tamagui'
import { config as defaultConfig } from '@tamagui/config/v3'

/**
 * Tamagui design tokens for Japanese Learning.
 *
 * The values here are extracted from apps/web/src/index.css — the current
 * CSS is the design source of truth. As we port each component we'll move
 * more tokens over; for the scaffold we keep the defaults plus the primary
 * colour palette used on the flashcards.
 */
export const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      primary: '#e53935',
      background: '#ffffff',
      cardBackground: '#f7f7f7',
      text: '#222222',
      textMuted: '#666666',
      border: '#e0e0e0',
      correct: '#2e7d32',
      incorrect: '#c62828',
    },
    dark: {
      ...defaultConfig.themes.dark,
      primary: '#ef5350',
      background: '#121212',
      cardBackground: '#1e1e1e',
      text: '#f5f5f5',
      textMuted: '#aaaaaa',
      border: '#333333',
      correct: '#66bb6a',
      incorrect: '#ef5350',
    },
  },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
