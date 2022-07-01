import type { Ref } from 'vue'
import { kebabCase } from 'scule'
import type { TokensPaths } from '#theme/types'
import { defineNuxtPlugin, unref } from '#imports'

export default defineNuxtPlugin(() => {
  const resolveToken = (path: TokensPaths | Ref<TokensPaths>): string => `var(--${unref(path).split('.').map(key => kebabCase(key)).join('-')})`

  return {
    provide: {
      tokens: resolveToken,
      t: resolveToken
    }
  }
})
