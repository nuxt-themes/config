import { defineEventHandler, isMethod, useBody } from 'h3'
// @ts-ignore
import { useStorage, useRuntimeConfig } from '#imports'
// @ts-ignore
import { generateTokens } from '#theme/server'

export default defineEventHandler(async (event) => {
  const storage = useStorage()
  const runtimeConfig = useRuntimeConfig()
  const { themeDir } = runtimeConfig?.theme

  if (isMethod(event, 'POST')) {
    const { tokens } = await useBody(event)

    if (tokens) {
      await storage.setItem('cache:theme-kit:tokens.json', tokens)
      await generateTokens(tokens, themeDir, true, false)
    }
  }

  return await storage.getItem('cache:theme-kit:tokens.json')
})
