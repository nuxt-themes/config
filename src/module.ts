import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addTemplate,
  addPlugin,
  addAutoImport
} from '@nuxt/kit'
import { withTrailingSlash } from 'ufo'
import type { DesignTokens } from 'browser-style-dictionary/types/browser'
import type { ViteDevServer } from 'vite'
import type { Nitro } from 'nitropack'
import { generateTokens } from './runtime/server/tokens'
import { logger, name, version, generateOptionsTyping, NuxtLayer, resolveTheme, motd, MODULE_DEFAULTS } from './utils'
import type { ThemeTokens, ThemeOptions } from '#theme/types'

export interface NuxtThemeMeta {
  name?: string
  description?: string
  author?: string
  url?: string
  motd?: boolean
}

export interface NuxtThemeOptions extends ThemeOptions {
  [key: string]: any
}

export interface NuxtThemeTokens extends ThemeTokens, DesignTokens {
}

export interface NuxtThemeConfig {
  meta?: NuxtThemeMeta
  options?: NuxtThemeOptions | boolean | string
  tokens?: NuxtThemeTokens | boolean | string
}

export { generateTokens }

export interface ModuleOptions extends NuxtThemeConfig {
  // Module options
}

export interface ModuleHooks {
  // Module hooks
}

export interface ModulePublicRuntimeConfig {
  metas?: NuxtThemeMeta[]
  options?: Partial<NuxtThemeOptions>
  themeDir?: string
}

export interface ModulePrivateRuntimeConfig {
  tokensFilePaths?: Array<string>
  optionsFilePaths?: Array<string>
  tokens?: NuxtThemeTokens
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    // @ts-ignore
    theme?: ModulePublicRuntimeConfig;
  }

  interface RuntimeConfig {
    // @ts-ignore
    theme?: ModulePrivateRuntimeConfig;
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: 'theme',
    compatibility: {
      nuxt: '^3.0.0-rc.4'
    }
  },
  defaults: MODULE_DEFAULTS,
  async setup (options, nuxt) {
    // Public runtime config
    nuxt.options.runtimeConfig.public.theme = {
      metas: [],
      options: {} as any,
      themeDir: ''
    }
    const runtimeConfig = nuxt.options.runtimeConfig.public.theme
    // Private runtime config
    nuxt.options.runtimeConfig.theme = {
      tokens: {} as ThemeTokens,
      tokensFilePaths: [],
      optionsFilePaths: []
    }
    const privateConfig = nuxt.options.runtimeConfig.theme

    nuxt.options.build.transpile = nuxt.options.build.transpile || []

    let nitro: Nitro
    nuxt.hook('nitro:init', (_nitro) => {
      nitro = _nitro
    })

    const themeDir = withTrailingSlash(nuxt.options.buildDir + '/theme')
    runtimeConfig.themeDir = themeDir
    const { resolve: resolveThemeDir } = createResolver(themeDir)

    // Runtime resolver
    const { resolve: resolveRuntime } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolveRuntime('./runtime') })

    // Transpile
    nuxt.options.build.transpile.push(resolveRuntime('./runtime'))

    // Nuxt `extends` key layers
    const layers = nuxt.options._layers

    const refreshTheme = () => {
      // Resolve theme configuration from every layer
      const { optionsFilePaths, tokensFilePaths, tokens, metas, options } = resolveTheme(layers as NuxtLayer[])

      // @ts-ignore - Apply data from theme resolving
      runtimeConfig.options = options
      runtimeConfig.metas = metas
      privateConfig.tokens = tokens
      privateConfig.tokensFilePaths = tokensFilePaths
      privateConfig.optionsFilePaths = optionsFilePaths

      if (nitro) {
        nitro.options.runtimeConfig.theme.options = options
        nitro.options._config.runtimeConfig.theme.options = options
      }
    }

    refreshTheme()

    motd(runtimeConfig.metas)

    // Add $theme plugin
    addPlugin({
      src: resolveRuntimeModule('./plugins/theme')
    })

    // Add options typings to templates
    addTemplate({
      filename: 'theme/options.d.ts',
      getContents: () => generateOptionsTyping(runtimeConfig.options)
    })

    // Enable design tokens feature
    let buildTokens: () => Promise<void> = () => new Promise(resolve => resolve())
    if (options.tokens) {
      // Transpile browser-style-dictionary
      nuxt.options.build.transpile.push('browser-style-dictionary')

      // Inject typings
      nuxt.hook('prepare:types', (opts) => {
        opts.references.push({ path: resolveThemeDir('./theme.d.ts') })
      })

      // Push tokens handlers
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.handlers = nitroConfig.handlers || []

        nitroConfig.handlers.push({
          method: 'get',
          route: '/api/_theme/tokens/generate',
          handler: resolveRuntimeModule('./server/api/tokens/generate')
        })

        nitroConfig.alias['#theme/server'] = resolveRuntime('./runtime/server/tokens')
      })

      buildTokens = async () => {
        try {
          await generateTokens(privateConfig.tokens, themeDir)
          logger.success('Tokens built succesfully!')
        } catch (e) {
          logger.error('Could not build tokens!')
          logger.error(e.message)
        }
      }

      nuxt.options.alias = nuxt.options.alias || {}

      nuxt.options.alias['#theme/client'] = resolveThemeDir('./tokens')

      nuxt.options.alias['#theme/types'] = resolveThemeDir('./tokens-types')

      nuxt.options.css = nuxt.options.css || []

      nuxt.options.css = [...nuxt.options.css, resolveThemeDir('./variables.css')]

      /**
       * Runtime
       */
      addPlugin({
        src: resolveRuntimeModule('./plugins/tokens')
      })
      addAutoImport({
        from: resolveRuntimeModule('./composables/tokens'),
        name: '$tokens',
        as: '$tokens'
      })
      addAutoImport({
        from: resolveRuntimeModule('./composables/tokens'),
        name: '$tokens',
        as: '$t'
      })
      addAutoImport({
        from: resolveRuntimeModule('./composables/theme'),
        name: 'useTheme',
        as: 'useTheme'
      })

      // Initial build
      await buildTokens()

      if (!nuxt.options.dev) {
        // Build
        nuxt.hook('build:before', buildTokens)
      }
    }

    // Development reload (theme.config)
    if (nuxt.options.dev) {
      nuxt.hook('vite:serverCreated', (viteServer: ViteDevServer) => {
        // Rebuild tokens on `token.config` changes
        if (privateConfig.tokensFilePaths.length) {
          nuxt.hook('builder:watch', async (_, path) => {
            // Watch on `tokens.config` if a config file is used
            const isTokenFile = privateConfig.tokensFilePaths.some(tokensFilePath => tokensFilePath.includes(path.replace('.js', '')) || tokensFilePath.includes(path.replace('.ts', '')))

            if (isTokenFile) {
              refreshTheme()
              await buildTokens()

              viteServer.ws.send({
                type: 'custom',
                event: 'nuxt-theme-kit:tokens-update',
                data: privateConfig.tokens
              })
            }
          })
        }

        if (privateConfig.optionsFilePaths.length) {
          // Watch on `theme.config` if a config file is used
          nuxt.hook('builder:watch', (_, path) => {
            const isOptionsFile = privateConfig.optionsFilePaths.some(optionsFilePath => optionsFilePath.includes(path.replace('.js', '')) || optionsFilePath.includes(path.replace('.ts', '')))

            if (isOptionsFile) {
              refreshTheme()

              viteServer.ws.send({
                type: 'custom',
                event: 'nuxt-theme-kit:options-update',
                data: runtimeConfig.options
              })
            }
          })
        }
      })
    }
  }
})

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T;

export const defineTheme = (options: DeepPartial<NuxtThemeOptions>): DeepPartial<NuxtThemeOptions> => options

export const defineThemeTokens = (tokens: DeepPartial<NuxtThemeTokens>): DeepPartial<NuxtThemeTokens> => tokens
