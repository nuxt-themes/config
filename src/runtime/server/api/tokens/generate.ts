import { defineEventHandler } from 'h3'
import { generateTokens } from '#theme/server'
import { useRuntimeConfig, useStorage } from '#imports'

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()

  const { themeDir } = runtimeConfig?.theme

  const storage = useStorage()

  const tokens = await storage.getItem('cache:theme-kit:tokens.json')

  await generateTokens(tokens, themeDir)
})
