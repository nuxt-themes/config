// import { fileURLToPath } from 'url'
import { defineNuxtConfig } from 'nuxt'
// import { resolve } from 'pathe'
import localModule from '../../src/module'

// const themeDir = fileURLToPath(new URL('./', import.meta.url))
// const resolveThemeDir = (path: string) => resolve(themeDir, path)

export default defineNuxtConfig({
  modules: [localModule, '@nuxtjs/design-tokens/module', '@nuxtjs/tailwindcss'],
  app: {
    theme: {
      meta: {
        name: 'Playground Theme',
        description: 'Just a basic Playground Theme',
        url: 'https://nuxt-themes.netlify.app',
        author: 'NuxtLabs',
        motd: true
      }
    }
  },
  tailwindcss: {
    viewer: false
  }
})
