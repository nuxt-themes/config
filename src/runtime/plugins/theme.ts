import { defineNuxtPlugin, useState, addRouteMiddleware } from '#imports'
import type { ThemeOptions, ThemeTokens } from '#theme/types'

export default defineNuxtPlugin(() => {
  const theme = useState<ThemeOptions>('nuxt-theme-kit-theme-options', () => undefined)

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
      'nuxt-theme-kit:update' as any,
      ({ options }: { options: ThemeOptions, tokens: ThemeTokens}) => {
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
