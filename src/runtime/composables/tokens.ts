import type { TokenPaths } from '#theme/types'
import { useNuxtApp } from '#imports'

export const $tokens = (path: TokenPaths): string => {
  const { $tokens: $t } = useNuxtApp()

  return $t(path)
}
