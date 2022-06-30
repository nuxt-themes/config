import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addTemplate,
  addPlugin,
  addAutoImport
} from '@nuxt/kit'
import { withTrailingSlash } from 'ufo'
import type { ViteDevServer } from 'vite'
import { defu } from 'defu'
import { generateTokens } from './runtime/server/utils'
import { logger, name, version, generateOptionsTyping, NuxtLayer, resolveTheme, motd, MODULE_DEFAULTS } from './utils'
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

    // Initial theme resolving
    const { tokens, metas } = resolveTheme(layers as NuxtLayer[])
    privateConfig.metas = metas

    // Create initial targets if tokens are enabled and directory does not exist
    if (nuxt.options.dev) {
      await generateTokens(tokens, themeDir, true, false)
    } else {
      nuxt.hook('build:before', async () => await generateTokens(tokens, themeDir, true, false))
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

    // Build initial tokens
    let buildTokens = async (_: any) => {}

    nuxt.hook('nitro:build:before', async (nitro) => {
      const refreshTheme = async () => {
        // Resolve theme configuration from every layer
        const { optionsFilePaths, tokensFilePaths, tokens, options } = resolveTheme(layers as NuxtLayer[])

        privateConfig.tokensFilePaths = tokensFilePaths
        privateConfig.optionsFilePaths = optionsFilePaths

        await nitro.storage.setItem('cache:theme-kit:tokens.json', tokens)
        await nitro.storage.setItem('cache:theme-kit:options.json', options)

        return { optionsFilePaths, tokensFilePaths, tokens, options }
      }

      // Grab options on init
      const { options } = await refreshTheme()

      // Add options typings to theme build directory
      addTemplate({
        filename: 'theme/options.d.ts',
        getContents: () => generateOptionsTyping(options)
      })

      // Print console messages
      motd(privateConfig.metas)

      // Build initial tokens
      await buildTokens(nitro)
    })

    // Development reload
    if (nuxt.options.dev) {
      const hasTokens = !!options.tokens
      const hasOptions = !!options.options

      nuxt.hook('nitro:init', (nitro) => {
        nuxt.hook('vite:serverCreated', (viteServer: ViteDevServer) => {
          nuxt.hook('builder:watch', async (_, path) => {
            const isTokenFile = hasTokens ? privateConfig.tokensFilePaths.some(tokensFilePath => tokensFilePath.includes(path.replace('.js', '')) || tokensFilePath.includes(path.replace('.ts', ''))) : false
            const isOptionsFile = hasOptions ? privateConfig.optionsFilePaths.some(optionsFilePath => optionsFilePath.includes(path.replace('.js', '')) || optionsFilePath.includes(path.replace('.ts', ''))) : false

            if (isTokenFile || isOptionsFile) {
              const { tokens, options, tokensFilePaths, optionsFilePaths } = resolveTheme(layers as NuxtLayer[])

              privateConfig.tokensFilePaths = hasTokens ? tokensFilePaths : []
              privateConfig.optionsFilePaths = hasOptions ? optionsFilePaths : []

              await nitro.storage.setItem('cache:theme-kit:tokens.json', hasTokens ? tokens || {} : {})
              await nitro.storage.setItem('cache:theme-kit:options.json', hasOptions ? options || {} : {})

              viteServer.ws.send({
                type: 'custom',
                event: 'nuxt-theme-kit:update',
                data: {
                  tokens: hasTokens ? tokens : {},
                  options: hasOptions ? options : {}
                }
              })

              if (hasTokens) { await buildTokens(nitro) }
            }
          })
        })
      })
    }

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

        nitroConfig.prerender = nitroConfig.prerender || {}
        nitroConfig.prerender.routes = nitroConfig.prerender.routes || []
        nitroConfig.prerender.routes.push('/api/_theme/tokens')
        nitroConfig.prerender.routes.push('/api/_theme/options')
        nitroConfig.bundledStorage = nitroConfig.bundledStorage || []
        nitroConfig.bundledStorage.push('/cache/theme-kit')
        nitroConfig.bundledStorage.push('/theme')

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
  }
})
