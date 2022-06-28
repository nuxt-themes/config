import type { Ref } from 'vue'
import { defineNuxtPlugin, useState, addRouteMiddleware } from '#imports'
import type { ThemeOptions, ThemeTokens } from '#theme/types'

export default defineNuxtPlugin(() => {
  const theme = useState('nuxt-theme-kit-theme-options', () => ({}))

  // Route middleware
  addRouteMiddleware(
    async () => {
      theme.value = await $fetch('/api/_theme/options', {
        method: 'GET'
      })
    }
  )

  // @ts-ignore
  if (import.meta.hot) {
    // @ts-ignore
    import.meta.hot.on(
      'nuxt-theme-kit:update' as any,
      async ({ tokens, options }: { options: ThemeOptions, tokens: ThemeTokens}) => {
        // Update theme
        theme.value = options

        await $fetch('/api/_theme/options', {
          method: 'POST',
          body: JSON.stringify({ options })
        })

        await $fetch('/api/_theme/tokens', {
          method: 'POST',
          body: JSON.stringify({ tokens })
        })
      }
    )
  }

  return {
    provide: {
      theme
    }
  }
})

declare module 'vue' {
  interface ComponentCustomProperties {
    $theme: Ref<ThemeOptions>
  }
}
