import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addPlugin,
  addAutoImport
} from '@nuxt/kit'
import { withTrailingSlash } from 'ufo'
import type { ViteDevServer } from 'vite'
import { defu } from 'defu'
import type { Nitro } from 'nitropack'
import { generateTokens } from './runtime/server/utils'
import { logger, name, version, generateOptionsTyping, NuxtLayer, resolveTheme, motd, MODULE_DEFAULTS, createThemeDir } from './utils'
import type { NuxtThemeTokens, ModuleOptions } from './index'

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
  async setup (moduleOptions, nuxt) {
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

    // Refresh theme function
    const refreshTheme = async (nitro?: Nitro) => {
      await createThemeDir(themeDir)

      // Resolve theme configuration from every layer
      const { optionsFilePaths, tokensFilePaths, tokens, options, metas } = resolveTheme(layers as NuxtLayer[])

      if (moduleOptions.options) { privateConfig.optionsFilePaths = optionsFilePaths }
      if (moduleOptions.tokens) { privateConfig.tokensFilePaths = tokensFilePaths }

      if (moduleOptions.options) { await generateOptionsTyping(themeDir, options) }

      if (nitro) {
        await nitro.storage.setItem('cache:theme-kit:tokens.json', tokens)
        await nitro.storage.setItem('cache:theme-kit:options.json', options)
      }

      return { options, optionsFilePaths, tokens, tokensFilePaths, metas }
    }

    // Set srcDir for external imports
    globalThis.__nuxtThemeKitBuildDir__ = themeDir

    // Theme dir resolver
    const { resolve: resolveThemeDir } = createResolver(themeDir)
    privateConfig.themeDir = themeDir

    // Initial theme resolving
    const { tokens, metas } = await refreshTheme()
    privateConfig.metas = metas

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

    // Build initial tokens
    let buildTokens = async (_: any) => {}

    nuxt.hook('nitro:build:before', async (nitro) => {
      // Grab options on init
      await refreshTheme(nitro)

      // Print console messages
      motd(privateConfig.metas)

      // Build initial tokens
      await buildTokens(nitro)
    })

    /**
     * Options features
     */

    if (moduleOptions.options) {
      // Push options handlers
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.handlers = nitroConfig.handlers || []

        nitroConfig.handlers.push({
          method: 'all',
          route: '/api/_theme/options',
          handler: resolveRuntimeModule('./server/api/options')
        })
      })
    }

    /**
     * Design Tokens feature
     */

    if (moduleOptions.tokens) {
      // Set buildTokens to real function as the feature is enabled
      buildTokens = async (nitro) => {
        try {
          const tokens = await nitro.storage.getItem('cache:theme-kit:tokens.json') as NuxtThemeTokens
          await generateTokens(tokens, themeDir)
          logger.success('Tokens built succesfully!')
        } catch (e) {
          logger.error('Could not build tokens!')
          logger.error(e.message)
        }
      }
      await generateTokens(tokens, themeDir)

      // Transpile browser-style-dictionary
      nuxt.options.build.transpile.push('browser-style-dictionary/browser.js')

      // Apply aliases
      nuxt.options.alias = nuxt.options.alias || {}
      nuxt.options.alias['#theme'] = resolveThemeDir('./index')
      nuxt.options.alias['#theme/types'] = resolveThemeDir('./index.d.ts')

      // Inject CSS
      nuxt.options.css = nuxt.options.css || []
      nuxt.options.css = [...nuxt.options.css, resolveThemeDir('./variables.css')]

      // Inject typings
      nuxt.hook('prepare:types', (opts) => {
        opts.references.push({ path: resolveThemeDir('./index.d.ts') })
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

        // Pre-render
        nitroConfig.prerender = nitroConfig.prerender || {}
        nitroConfig.prerender.routes = nitroConfig.prerender.routes || []
        nitroConfig.prerender.routes.push('/api/_theme/tokens')
        nitroConfig.prerender.routes.push('/api/_theme/options')

        // Bundled storage
        nitroConfig.bundledStorage = nitroConfig.bundledStorage || []
        nitroConfig.bundledStorage.push('/cache/theme-kit')
        nitroConfig.bundledStorage.push('/theme')

        // Inlined dependencies
        nitroConfig.externals = defu(typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {}, {
          inline: [
            'lodash',
            'browser-style-dictionary',
            'browser-style-dictionary/lib',
            'browser-style-dictionary/browser',
            // Inline module runtime in Nitro bundle
            resolveRuntime()
          ]
        })

        // Aliases
        nitroConfig.alias['#theme-tokens'] = resolveRuntime('./runtime/server/utils')
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
    }

    /**
     * Build environments
     */

    if (nuxt.options.dev) {
      // Development builds

      // Create initial build targets for tokens
      await generateTokens(tokens, themeDir, true)

      nuxt.hook('nitro:init', (nitro) => {
        nuxt.hook('vite:serverCreated', (viteServer: ViteDevServer) => {
          nuxt.hook('builder:watch', async (_, path) => {
            const isTokenFile = moduleOptions.tokens ? privateConfig.tokensFilePaths.some(tokensFilePath => tokensFilePath.includes(path.replace('.js', '')) || tokensFilePath.includes(path.replace('.ts', ''))) : false
            const isOptionsFile = moduleOptions.meta ? privateConfig.optionsFilePaths.some(optionsFilePath => optionsFilePath.includes(path.replace('.js', '')) || optionsFilePath.includes(path.replace('.ts', ''))) : false

            if (isTokenFile || isOptionsFile) {
              const { tokens, options } = await refreshTheme(nitro)

              viteServer.ws.send({
                type: 'custom',
                event: 'nuxt-theme-kit:update',
                data: {
                  options: moduleOptions.options ? options : {},
                  tokens: moduleOptions.tokens ? tokens : {}
                }
              })

              if (moduleOptions.tokens) { await buildTokens(nitro) }
            }
          })
        })
      })
    } else {
      // Production builds

      nuxt.hook('build:before', async () => await generateTokens(tokens, themeDir, true))
    }
  }
})
