import { fileURLToPath } from 'url'
import { defineNuxtConfig } from 'nuxt'
import { resolve } from 'pathe'

const themeDir = fileURLToPath(new URL('./', import.meta.url))
const resolveThemeDir = (path: string) => resolve(themeDir, path)

export default defineNuxtConfig({
  extends: [resolveThemeDir('./theme')],
  theme: {}
})
