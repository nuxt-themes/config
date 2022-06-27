import { defineNuxtPlugin, useTheme } from '#imports'
import type { ThemeOptions } from '#theme/types'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      theme: useTheme()
    }
  }
})

declare module 'vue' {
  interface ComponentCustomProperties {
    $theme: ThemeOptions
  }
}
