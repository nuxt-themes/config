import { defineNuxtConfig } from 'nuxt'
import colors from 'tailwindcss/colors.js'

export default defineNuxtConfig({
  modules: ['vue-plausible'],
  extends: [
    (process.env.DOCUS_THEME_PATH || '../node_modules/@docus/docs-theme')
  ],
  components: [
    {
      path: '~/components',
      prefix: '',
      global: true
    }
  ],
  tailwindcss: {
    config: {
      theme: {
        extend: {
          colors: {
            primary: colors.pink
          }
        }
      }
    }
  },
  colorMode: {
    preference: 'dark'
  },
  theme: {
    layout: 'docs'
  }
})
