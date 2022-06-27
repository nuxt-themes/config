import { defineEventHandler, isMethod, useBody } from 'h3'
import { useStorage } from '#imports'

export default defineEventHandler(async (event) => {
//   const { themeKit } = useRuntimeConfig()
  const storage = useStorage()

  if (isMethod(event, 'POST')) {
    const { tokens, options } = await useBody(event)
    if (tokens) {
      await storage.setItem('cache:theme-kit:tokens.json', tokens)
    }
    if (options) {
      await storage.setItem('cache:theme-kit:options.json', options)
    }
  }

  const tokens = await storage.getItem('cache:theme-kit:tokens.json')
  const options = await storage.getItem('cache:theme-kit:options.json')

  return {
    tokens,
    options
  }
})
