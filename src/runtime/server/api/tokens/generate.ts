import { defineEventHandler } from 'h3'
// @ts-ignore
import { generateTokens } from '#theme-tokens'
// @ts-ignore
import { useRuntimeConfig, useStorage } from '#imports'

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()

  const { themeDir } = runtimeConfig?.theme

  const storage = useStorage()

  const tokens = await storage.getItem('cache:theme-kit:tokens.json')

  await generateTokens(tokens, themeDir)
})
