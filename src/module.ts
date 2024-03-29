import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addPlugin,
  addAutoImport
} from '@nuxt/kit'
import { withTrailingSlash } from 'ufo'
import { join } from 'pathe'
import type { ViteDevServer } from 'vite'
import { defu } from 'defu'
import type { Nitro } from 'nitropack'
import { name, version, generateOptionsTyping, NuxtLayer, resolveTheme, motd, MODULE_DEFAULTS, createThemeDir } from './utils'
import type { ModuleOptions } from './index'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    compatibility: {
      nuxt: '^3.0.0-rc.6'
    }
  },
  async setup (_, nuxt) {
    // Use `app.theme` key
    const moduleOptions = defu((nuxt.options.app as any)?.theme || {}, MODULE_DEFAULTS)

    // Nuxt `extends` key layers
    const layers = nuxt.options._layers

    // `.nuxt/theme` resolver
    const themeDir = withTrailingSlash(nuxt.options.buildDir + '/theme')

    // Private runtime config
    nuxt.options.runtimeConfig.theme = {
      optionsFilePaths: [],
      metas: [],
      schema: undefined,
      themeDir
    }

    const privateConfig = nuxt.options.runtimeConfig.theme

    // Refresh theme function
    const refreshTheme = async (nitro?: Nitro) => {
      await createThemeDir(themeDir)

      // Resolve theme configuration from every layer
      const { optionsFilePaths, options, schema, metas } = resolveTheme(layers as NuxtLayer[])

      if (moduleOptions.options) {
        privateConfig.optionsFilePaths = optionsFilePaths
        privateConfig.schema = schema
        await generateOptionsTyping(themeDir, schema, options)
      }

      if (nitro) {
        await nitro.storage.setItem('cache:theme:options.json', options)
      }

      return { options, optionsFilePaths, metas }
    }

    // Set srcDir for external imports
    globalThis.__nuxtThemeBuildDir__ = themeDir

    // Theme dir resolver
    const { resolve: resolveThemeDir } = createResolver(themeDir)
    privateConfig.themeDir = themeDir

    // Initial theme resolving
    const { metas } = await refreshTheme()
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

    nuxt.hook('nitro:build:before', async (nitro) => {
      // Grab options on init
      await refreshTheme(nitro)

      // Print console messages
      motd(privateConfig.metas)
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

    // Apply aliases
    nuxt.options.alias = nuxt.options.alias || {}
    nuxt.options.alias['#theme'] = resolveThemeDir('./index')

    // Inject typings
    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolveThemeDir('./index.d.ts') })
    })

    // Push handlers
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.handlers = nitroConfig.handlers || []

      // Pre-render
      nitroConfig.prerender = nitroConfig.prerender || {}
      nitroConfig.prerender.routes = nitroConfig.prerender.routes || []
      nitroConfig.prerender.routes.push('/api/_theme/options')

      // Bundled storage
      nitroConfig.bundledStorage = nitroConfig.bundledStorage || []
      nitroConfig.bundledStorage.push('/cache/theme')
      nitroConfig.bundledStorage.push('/theme')

      // Inlined dependencies
      nitroConfig.externals = defu(typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {}, {
        inline: [
          // Inline module runtime in Nitro bundle
          resolveRuntime()
        ]
      })

      // Aliases
      nitroConfig.alias['#theme'] = resolveRuntime('./runtime/server/utils')
    })

    addAutoImport({
      from: resolveRuntimeModule('./composables/theme'),
      name: 'useTheme',
      as: 'useTheme'
    })

    if (nuxt.options.dev) {
      nuxt.hook('nitro:init', (nitro) => {
        nuxt.hook('vite:serverCreated', (viteServer: ViteDevServer) => {
          nuxt.hook('builder:watch', async (_, path) => {
            const isOptionsFile = path.includes('theme.config.ts') || path.includes('theme.config.js')

            if (isOptionsFile) {
              const { options } = await refreshTheme(nitro)

              viteServer.ws.send({
                type: 'custom',
                event: 'theme:options:update',
                data: {
                  options: moduleOptions.options ? options : {}
                }
              })
            }
          })
        })
      })
    }

    nuxt.hook('build:before', async () => {
      await refreshTheme()
    })

    // @nuxtjs/tailwindcss support
    // @ts-ignore - Module might not exist
    nuxt.hook('tailwindcss:config', (tailwindConfig) => {
      tailwindConfig.content = tailwindConfig.content ?? []
      tailwindConfig.content.push(join(themeDir, 'index.js'))
    })
  }
})
