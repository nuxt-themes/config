import { defineEventHandler, isMethod, useBody } from 'h3'
// @ts-ignore
import { useStorage } from '#imports'

export default defineEventHandler(async (event) => {
  const storage = useStorage()

  if (isMethod(event, 'POST')) {
    try {
      const { options } = await useBody(event)
      if (options) {
        await storage.setItem('cache:theme-kit:options.json', options)
      }
    } catch (_) {}
  }

  return await storage.getItem('cache:theme-kit:options.json')
})
