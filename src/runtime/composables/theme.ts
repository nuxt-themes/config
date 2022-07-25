import type { Ref } from 'vue'
import { useNuxtApp } from '#imports'
import type { ThemeOptions } from '#theme'

export const useTheme = () => {
  const { $theme } = useNuxtApp()

  return $theme as Ref<ThemeOptions>
}
