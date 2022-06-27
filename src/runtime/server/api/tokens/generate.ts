import { defineEventHandler } from 'h3'
import { generateTokens } from '#theme/server'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()

  const { tokensDir } = runtimeConfig?.public

  const { tokens } = runtimeConfig?.theme

  await generateTokens(tokens, tokensDir)
})
