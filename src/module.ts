import { existsSync } from 'fs'
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
import { join } from 'pathe'
import { generateTokens } from './runtime/server/utils'
import { logger, name, version, generateOptionsTyping, NuxtLayer, resolveTheme, motd, MODULE_DEFAULTS } from './utils'
// @ts-ignore - Might be unavailable whens stubbing occurs
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
  // Module public config
}

// Non-reactive data taken from initial boot
export interface ModulePrivateRuntimeConfig {
  themeDir?: string
  metas?: NuxtThemeMeta[]
  tokensFilePaths?: Array<string>
  optionsFilePaths?: Array<string>
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
    // Private runtime config
    nuxt.options.runtimeConfig.theme = {
      tokensFilePaths: [],
      optionsFilePaths: []
    }

    // Nuxt `extends` key layers
    const layers = nuxt.options._layers

    const privateConfig = nuxt.options.runtimeConfig.theme

    // `.nuxt/theme` resolver
    const themeDir = withTrailingSlash(nuxt.options.buildDir + '/theme')
    const { resolve: resolveThemeDir } = createResolver(themeDir)
    privateConfig.themeDir = themeDir

    // Create initial targets if tokens are enabled and directory does not exist
    if (!existsSync(join(themeDir, 'tokens')) && !!options.tokens) {
      const { tokens } = resolveTheme(layers as NuxtLayer[])
      await generateTokens(tokens, themeDir, true, false)
    }

    // `runtime/` resolver
    const { resolve: resolveRuntime } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolveRuntime('./runtime') })

    // Transpile
    nuxt.options.build.transpile = nuxt.options.build.transpile || []
    nuxt.options.build.transpile.push(resolveRuntime('./runtime'))

    // Add $theme plugin
    addPlugin({
      src: resolveRuntimeModule('./plugins/theme')
    })

    // buildTokens proxy
    let buildTokens: () => Promise<void> = () => new Promise(resolve => resolve())
    nuxt.hook('nitro:init', async (nitro) => {
      const refreshTheme = async () => {
        // Resolve theme configuration from every layer
        const { optionsFilePaths, tokensFilePaths, tokens, metas, options } = resolveTheme(layers as NuxtLayer[])

        privateConfig.metas = metas
        privateConfig.tokensFilePaths = tokensFilePaths
        privateConfig.optionsFilePaths = optionsFilePaths

        await nitro.storage.setItem('cache:theme-kit:tokens.json', tokens)
        await nitro.storage.setItem('cache:theme-kit:options.json', options)

        return { optionsFilePaths, tokensFilePaths, tokens, metas, options }
      }

      // Grab options on init
      const { options } = await refreshTheme()

      // Add options typings to theme build directory
      addTemplate({
        filename: 'theme/options.d.ts',
        getContents: () => generateOptionsTyping(options)
      })

      // Development reload (theme.config | tokens.config)
      if (nuxt.options.dev) {
      // TODO: Replace by custom WS server
        nuxt.hook('vite:serverCreated', (viteServer: ViteDevServer) => {
          if (privateConfig.tokensFilePaths.length || privateConfig.optionsFilePaths.length) {
            nuxt.hook('builder:watch', async (_, path) => {
              const isTokenFile = privateConfig.tokensFilePaths.some(tokensFilePath => tokensFilePath.includes(path.replace('.js', '')) || tokensFilePath.includes(path.replace('.ts', '')))
              const isOptionsFile = privateConfig.optionsFilePaths.some(optionsFilePath => optionsFilePath.includes(path.replace('.js', '')) || optionsFilePath.includes(path.replace('.ts', '')))

              if (isTokenFile || isOptionsFile) {
                const { tokens, options, tokensFilePaths, optionsFilePaths } = resolveTheme(layers as NuxtLayer[])

                privateConfig.tokensFilePaths = tokensFilePaths
                privateConfig.optionsFilePaths = optionsFilePaths

                viteServer.ws.send({
                  type: 'custom',
                  event: 'nuxt-theme-kit:update',
                  data: {
                    tokens,
                    options
                  }
                })

                await nitro.storage.setItem('cache:theme-kit:tokens.json', tokens)
                await nitro.storage.setItem('cache:theme-kit:options.json', options)
              }
            })
          }
        })
      }

      // Print console messages
      motd(privateConfig.metas)
    })

    // Push options handlers
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.handlers = nitroConfig.handlers || []

      nitroConfig.handlers.push({
        method: 'all',
        route: '/api/_theme/options',
        handler: resolveRuntimeModule('./server/api/options')
      })

      nitroConfig.alias['#theme/server'] = resolveRuntime('./runtime/server/utils')
    })

    // Enable design tokens feature
    if (options.tokens) {
      // Transpile browser-style-dictionary
      nuxt.options.build.transpile.push('browser-style-dictionary')

      // Apply aliases
      nuxt.options.alias = nuxt.options.alias || {}
      nuxt.options.alias['#theme/client'] = resolveThemeDir('./tokens')
      nuxt.options.alias['#theme/types'] = resolveThemeDir('./tokens-types')

      // Inject CSS
      nuxt.options.css = nuxt.options.css || []
      nuxt.options.css = [...nuxt.options.css, resolveThemeDir('./variables.css')]

      // Inject typings
      nuxt.hook('prepare:types', (opts) => {
        opts.references.push({ path: resolveThemeDir('./theme.d.ts') })
      })

      // Push handlers
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.handlers = nitroConfig.handlers || []

        nitroConfig.handlers.push({
          method: 'get',
          route: '/api/_theme/tokens/generate',
          handler: resolveRuntimeModule('./server/api/tokens/generate')
        })

        nitroConfig.handlers.push({
          method: 'all',
          route: '/api/_theme/tokens',
          handler: resolveRuntimeModule('./server/api/tokens/index')
        })
      })

      nuxt.hook('nitro:init', async (nitro) => {
        buildTokens = async () => {
          try {
            const tokens = await nitro.storage.getItem('cache:theme-kit:tokens.json') as NuxtThemeTokens
            await generateTokens(tokens, themeDir)
            logger.success('Tokens built succesfully!')
          } catch (e) {
            logger.error('Could not build tokens!')
            logger.error(e.message)
          }
        }

        await buildTokens()
      })

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
  }
})

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T;

export const defineTheme = (options: DeepPartial<NuxtThemeOptions>): DeepPartial<NuxtThemeOptions> => options

export const defineThemeTokens = (tokens: DeepPartial<NuxtThemeTokens>): DeepPartial<NuxtThemeTokens> => tokens
