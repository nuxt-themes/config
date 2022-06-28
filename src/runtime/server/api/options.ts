import { defineEventHandler, isMethod, useBody } from 'h3'
import { useStorage } from '#imports'

export default defineEventHandler(async (event) => {
  const storage = useStorage()

  if (isMethod(event, 'POST')) {
    const { options } = await useBody(event)
    if (options) {
      await storage.setItem('cache:theme-kit:options.json', options)
    }
  }

  return await storage.getItem('cache:theme-kit:options.json')
})
