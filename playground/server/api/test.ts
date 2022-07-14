import { defineEventHandler } from 'h3'
// @ts-ignore
import { useTheme } from '#theme'

export default defineEventHandler(async () => {
  const theme = await useTheme()

  return { theme }
})
