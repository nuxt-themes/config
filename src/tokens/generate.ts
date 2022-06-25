import { DesignTokens, Core as Instance } from 'browser-style-dictionary/types/browser'
import StyleDictionary from 'browser-style-dictionary/browser.js'

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
    obj.variable = `var(--${obj.name.replace(/_/g, '-').toLowerCase()})`

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

export const generateTokens = async (tokens: DesignTokens, buildPath: string, silent = true) => {
  let styleDictionary: Instance = StyleDictionary

  styleDictionary.fileHeader = {}

  styleDictionary.registerTransformGroup({
    name: 'tokens-js',
    transforms: ['name/cti/constant', 'size/px', 'color/hex']
  })

  styleDictionary.registerFormat({
    name: 'typescript/css-variables-declaration',
    formatter ({ dictionary }) {
      let result = 'import type { Ref } from \'vue\'\n\n'

      result = result + `export ${DesignTokenType}\n\n`

      result = result + `export interface ThemeTokens ${JSON.stringify(treeWalker(dictionary.tokens), null, 2)}\n\n`

      const tokenPaths = dictionary.allTokens.map(token => `'${token.name.replace(/_/g, '.').toLowerCase()}'`)

      result = result + `export type TokenPaths = ${tokenPaths.join(' | \n')}\n\n`

      result = result +
`declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: (path: Ref<TokenPaths> | TokenPaths) => string
    $tokens: (path: Ref<TokenPaths> | TokenPaths) => string
  }
}\n\n`

      result = result.replace(/"DesignToken"/g, 'DesignToken')

      return result
    }
  })

  styleDictionary.registerFormat({
    name: 'typescript/css-variables',
    formatter ({ dictionary }) {
      let result = 'import type { ThemeTokens } from \'#tokens/types\'\n\n'

      result = result + 'export * from \'#tokens/types\'\n\n'

      result = result + `export const themeTokens: ThemeTokens = ${JSON.stringify(treeWalker(dictionary.tokens, false), null, 2)}\n\n`

      return result
    }
  })

  styleDictionary.registerFormat({
    name: 'javascript/css-variables',
    formatter ({ dictionary }) {
      let result = `export const themeTokens = ${JSON.stringify(treeWalker(dictionary.tokens, false), null, 2)}\n\n`

      result = result + 'export default themeTokens'

      return result
    }
  })

  styleDictionary = await styleDictionary.extend({
    tokens,
    platforms: {
      scss: {
        transformGroup: 'scss',
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
            destination: 'tokens.d.ts',
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
        transformGroup: 'web',
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

  if (process.dev) { styleDictionary.cleanAllPlatforms() }

  styleDictionary.buildAllPlatforms()

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
