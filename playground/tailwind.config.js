import { $t } from './.nuxt/theme/tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        black: {
          DEFAULT: $t('colors.black').variable
        },
        grape: {
          DEFAULT: $t('colors.grape').variable
        },
        lila: {
          DEFAULT: $t('colors.lila').variable
        },
        grey: {
          DEFAULT: $t('colors.grey').variable
        },
        lavender: {
          DEFAULT: $t('colors.lavender').variable
        }
      }
    }
  }
}
