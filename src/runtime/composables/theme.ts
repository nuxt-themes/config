import type { PublicRuntimeConfig } from '@nuxt/schema'
import { useRuntimeConfig, useState } from '#imports'

export const useTheme = () => {
  const runtimeConfig = useRuntimeConfig()

  /**
   * This is nasty way to preserve `runtimeConfig` changes after page reload.
   *
   * This is here for DX proof of concept.
   */
  // const cookie = useCookie<NuxtThemeOptions>('nuxt-theme-kit-theme-options')

  const configState = useState(
    'nuxt-theme-kit-theme-options',
    () => {
      // TODO: move to middleware and read from api
      // @ts-ignore
      if (process.server) {
        return runtimeConfig.public.theme?.options || {}
      }

      return (runtimeConfig as PublicRuntimeConfig).theme?.options || {}
    }
  )

  return configState
}
