import $tokens from './.nuxt/tokens/tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: $tokens.colors.red[500].variable,
          100: $tokens.colors.red[100].variable,
          200: $tokens.colors.red[200].variable,
          300: $tokens.colors.red[300].variable,
          400: $tokens.colors.red[400].variable,
          500: $tokens.colors.red[500].variable,
          600: $tokens.colors.red[600].variable,
          700: $tokens.colors.red[700].variable,
          800: $tokens.colors.red[800].variable,
          900: $tokens.colors.red[900].variable
        }
      }
    }
  }
}
