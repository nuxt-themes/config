import $tokens from './.nuxt/tokens/tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: $tokens.color.red[500].variable,
          100: $tokens.color.red[100].variable,
          200: $tokens.color.red[200].variable,
          300: $tokens.color.red[300].variable,
          400: $tokens.color.red[400].variable,
          500: $tokens.color.red[500].variable,
          600: $tokens.color.red[600].variable,
          700: $tokens.color.red[700].variable,
          800: $tokens.color.red[800].variable,
          900: $tokens.color.red[900].variable
        }
      }
    }
  }
}
