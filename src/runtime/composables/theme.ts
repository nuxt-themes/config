import type { Ref } from 'vue'
import { useNuxtApp } from '#imports'
import type { ThemeOptions } from '#theme/types'

export const useTheme = () => {
  const { $theme } = useNuxtApp()

  return $theme as Ref<ThemeOptions>
}
