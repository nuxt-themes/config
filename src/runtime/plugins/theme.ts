import { defineNuxtPlugin, useState, addRouteMiddleware } from '#imports'
import type { ThemeOptions } from '#theme'

export default defineNuxtPlugin(() => {
  const theme = useState<ThemeOptions>('nuxt-theme-config-theme-options', () => undefined)

  // Route middleware
  addRouteMiddleware(
    async () => {
      if (theme.value) { return }

      theme.value = await $fetch('/api/_theme/options', {
        method: 'GET',
        responseType: 'json'
      })
    }
  )

  // @ts-ignore
  if (import.meta.hot) {
    // @ts-ignore
    import.meta.hot.on(
      'theme:options:update' as any,
      ({ options }: { options: ThemeOptions }) => {
        theme.value = options
      }
    )
  }

  return {
    provide: {
      theme
    }
  }
})
