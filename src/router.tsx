import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import RootLayout from './App'
import { StudyPage } from './pages/StudyPage'
import { SettingsRoute } from './pages/SettingsRoute'
import { ProfileRoute } from './pages/ProfileRoute'

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: StudyPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfileRoute,
})

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, profileRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
