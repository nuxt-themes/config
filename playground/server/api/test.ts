import { defineEventHandler } from 'h3'
// @ts-ignore
import { useTheme } from '#theme'

export default defineEventHandler(async (event) => {
  const theme = await useTheme()

  return { theme }
})
