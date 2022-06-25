import type { TokenPaths } from '#tokens/types'
import { useNuxtApp } from '#imports'

export const $tokens = (path: TokenPaths): string => {
  const { $tokens: $t } = useNuxtApp()

  return $t(path)
}
