import type { Ref } from 'vue'
import type { TokenPaths } from '#tokens'
import { defineNuxtPlugin, unref } from '#imports'

export default defineNuxtPlugin(() => {
  const resolveToken = (path: TokenPaths | Ref<TokenPaths>): string => `var(--${unref(path).split('.').join('-')})`

  return {
    provide: {
      tokens: resolveToken,
      t: resolveToken
    }
  }
})
