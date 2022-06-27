import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import type { PublicRuntimeConfig } from '@nuxt/schema'
import { NuxtThemeOptions } from '#theme/types'
import { useRuntimeConfig, useState, useCookie } from '#imports'

export const useTheme = (): ComputedRef<NuxtThemeOptions> => {
  const runtimeConfig = useRuntimeConfig()

  /**
   * This is nasty way to preserve `runtimeConfig` changes after page reload.
   *
   * This is here for DX proof of concept.
   */
  const cookie = useCookie<NuxtThemeOptions>('nuxt-theme-kit-theme-options')

  const configState = useState(
    'nuxt-theme-kit-theme-options',
    () => {
      // @ts-ignore
      if (process.server) {
        return cookie.value || runtimeConfig.public.theme?.options || {}
      }

      return cookie.value || (runtimeConfig as PublicRuntimeConfig).theme?.options || {}
    }
  )

  const themeConfig = computed(() => configState.value)

  if (import.meta.hot) {
    import.meta.hot.on(
      'nuxt-theme-kit:options-update' as any,
      (data: NuxtThemeOptions) => {
        cookie.value = data
        configState.value = data
      }
    )
  }

  return themeConfig
}
