import type { Core as Instance } from 'browser-style-dictionary/types/browser'
import StyleDictionary from 'browser-style-dictionary/browser.js'
import type { NuxtThemeTokens } from '../../module'

const DesignTokenType =
`interface DesignToken {
  value: any;
  name?: string;
  comment?: string;
  themeable?: boolean;
  attributes?: {
    category?: string;
    type?: string;
    item?: string;
    subitem?: string;
    state?: string;
    [key: string]: any;
  };
  [key: string]: any;
}`

const treeWalker = (obj, typing: boolean = true) => {
  let type = Object.create(null)

  const has = Object.prototype.hasOwnProperty.bind(obj)

  if (has('value')) {
    // Transform name to CSS variable name
    obj.variable = `var(--${obj.name})`

    // Toggle between type declaration and value
    type = typing ? 'DesignToken' : obj
  } else {
    for (const k in obj) {
      if (has(k)) {
        switch (typeof obj[k]) {
          case 'object':
            type[k] = treeWalker(obj[k], typing)
        }
      }
    }
  }

  return type
}

export const generateTokens = async (
  tokens: NuxtThemeTokens,
  buildPath: string,
  silent = true,
  force: boolean = true
) => {
  let styleDictionary: Instance = StyleDictionary

  styleDictionary.fileHeader = {}

  styleDictionary.registerTransformGroup({
    name: 'tokens-js',
    transforms: ['name/cti/kebab', 'size/px', 'color/hex']
  })

  styleDictionary.registerFormat({
    name: 'typescript/css-variables-declaration',
    formatter ({ dictionary }) {
      let result = 'import type { Ref } from \'vue\'\n\n'

      result = result + 'import type { DesignTokens } from \'browser-style-dictionary/types/browser\'\n\n'

      result = result + 'export * from \'./options.d\'\n\n'

      result = result + `export ${DesignTokenType}\n\n`

      result = result + `export interface ThemeTokens extends DesignTokens ${JSON.stringify(treeWalker(dictionary.tokens), null, 2)}\n\n`

      const tokenPaths = dictionary.allTokens.map(token => `'${token.name.replace(/-/g, '.').toLowerCase()}'`)

      result = result + `export type TokenPaths = ${tokenPaths.join(' | \n')}\n\n`

      result = result +
`declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: (path: Ref<TokenPaths> | TokenPaths) => string
    $tokens: (path: Ref<TokenPaths> | TokenPaths) => string
  }
}\n\n`

      result = result +
`declare module '@nuxt/schema' {
  interface NuxtConfig {
    theme: Partial<NuxtThemeConfig>
  }
}\n\n`

      result = result.replace(/"DesignToken"/g, 'DesignToken')

      return result
    }
  })

  styleDictionary.registerFormat({
    name: 'typescript/css-variables',
    formatter ({ dictionary }) {
      let result = 'import get from \'lodash.get\'\n\n'

      result = result + 'import type { ThemeTokens, TokenPaths } from \'./tokens-types\'\n\n'

      result = result + 'export * from \'./tokens-types\'\n\n'

      result = result + `export const themeTokens: ThemeTokens = ${JSON.stringify(treeWalker(dictionary.tokens, false), null, 2)}\n\n`

      result = result + 'export const $tokens = (path: TokenPaths) => get(themeTokens, path)\n\n'

      result = result + 'export const $t = $tokens\n\n'

      return result
    }
  })

  styleDictionary.registerFormat({
    name: 'javascript/css-variables',
    formatter ({ dictionary }) {
      let result = 'import get from \'lodash.get\'\n\n'

      result = result + `export const themeTokens = ${JSON.stringify(treeWalker(dictionary.tokens, false), null, 2)}\n`

      result = result +
`\n
/**
 * Get a theme token by its path
 * @typedef {import('token-types').TokenPaths} TokenPaths
 * @param {TokenPaths} path
 */
export const $tokens = (path) => get(themeTokens, path)\n\n`

      result = result + 'export const $t = $tokens\n\n'

      result = result + 'export default { $t, $tokens, themeTokens }'

      return result
    }
  })

  styleDictionary = await styleDictionary.extend({
    tokens,
    platforms: {
      scss: {
        transformGroup: 'tokens-js',
        buildPath,
        files: [
          {
            destination: '_variables.scss',
            format: 'scss/variables'
          }
        ]
      },

      json: {
        transformGroup: 'tokens-js',
        buildPath,
        files: [
          {
            destination: 'tokens.json',
            format: 'json/flat'
          }
        ]
      },

      ts: {
        transformGroup: 'tokens-js',
        buildPath,
        files: [
          {
            destination: 'tokens.ts',
            format: 'typescript/css-variables'
          },
          {
            destination: 'tokens-types.d.ts',
            format: 'typescript/css-variables-declaration'
          }
        ]
      },

      js: {
        transformGroup: 'tokens-js',
        buildPath,
        files: [
          {
            destination: 'tokens.js',
            format: 'javascript/css-variables'
          }
        ]
      },

      css: {
        transformGroup: 'tokens-js',
        buildPath,
        files: [
          {
            destination: 'variables.css',
            format: 'css/variables'
          }
        ]
      }
    }
  })

  // Weird trick to disable nasty logging
  if (silent) {
    // @ts-ignore
    // eslint-disable-next-line no-console
    console._log = console.log
    // eslint-disable-next-line no-console
    console.log = () => {}
  }

  // @ts-ignore
  if (process?.dev && force) { styleDictionary.cleanAllPlatforms() }

  styleDictionary.buildAllPlatforms()

  await new Promise(resolve => setTimeout(resolve, 100))

  // Weird trick to disable nasty logging
  if (silent) {
    // @ts-ignore
    // eslint-disable-next-line no-console
    console.log = console._log
    // @ts-ignore
    // eslint-disable-next-line no-console
    delete console._log
  }
}
