import type { NuxtThemeOptions } from '../../module'
import { defineNuxtPlugin, useTheme } from '#imports'
import type { ThemeOptions } from '#theme/types'

export default defineNuxtPlugin(() => {
  const theme = useTheme()
  if (import.meta.hot) {
    import.meta.hot.on(
      'nuxt-theme-kit:update' as any,
      async (data: NuxtThemeOptions) => {
        // cookie.value = data
        theme.value = data
        await $fetch('/api/_theme/config', {
          method: 'POST',
          body: JSON.stringify(data)
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
    $theme: ThemeOptions
  }
}
