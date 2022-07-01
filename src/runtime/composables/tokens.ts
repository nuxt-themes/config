import type { TokensPaths } from '#theme/types'
import { useNuxtApp } from '#imports'

export const $tokens = (path: TokensPaths): string => {
  const { $tokens: $t } = useNuxtApp()

  return $t(path)
}
