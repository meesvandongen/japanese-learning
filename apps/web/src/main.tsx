import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { TamaguiProvider, Theme } from 'tamagui'
import config from '../tamagui.config'
import { router } from './router'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme="light">
        <Theme name="light">
          <RouterProvider router={router} />
        </Theme>
      </TamaguiProvider>
    </QueryClientProvider>
  </StrictMode>
)
