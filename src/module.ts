import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addTemplate,
  addPlugin,
  addAutoImport
} from '@nuxt/kit'
import { withTrailingSlash } from 'ufo'
import { resolve } from 'pathe'
import { generateTokens } from './tokens/generate'
import { NuxtThemeConfig, NuxtThemeMeta } from './types.d'
import { logger, name, version, generateTyping, NuxtLayer, resolveTheme, motd } from './utils'

export interface ModuleOptions extends NuxtThemeConfig {
}

export interface ModuleHooks {
  // Module hooks
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
  defaults: {
    meta: {
      name: 'My Nuxt Theme',
      description: 'My Nuxt Theme',
      author: '',
      motd: true
    },
    tokens: true
  },
  async setup (options, nuxt) {
    // Public runtime config
    const runtimeConfig = nuxt.options.runtimeConfig.public
    // Private runtime config
    nuxt.options.runtimeConfig.theme = {}
    const privateConfig = nuxt.options.runtimeConfig.theme

    nuxt.options.build.transpile = nuxt.options.build.transpile || []

    // Runtime resolver
    const { resolve: resolveRuntime } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolveRuntime('./runtime') })

    // Transpile
    nuxt.options.build.transpile.push(resolveRuntime('./runtime'))

    // Nuxt `extends` key layers
    const layers = nuxt.options._layers

    const refreshTheme = () => {
      // Resolve theme configuration from every layer
      const { tokensFilePaths, ...themeConfig } = resolveTheme(layers as NuxtLayer[])

      // Apply data from theme resolving
      runtimeConfig.theme = themeConfig
      privateConfig.tokensFilePaths = tokensFilePaths
    }

    refreshTheme()

    // Add typings to templates
    addTemplate({
      filename: 'types/theme.d.ts',
      getContents: () => generateTyping(runtimeConfig.theme)
    })

    // Enable design tokens feature
    if (options.tokens) {
      // Transpile browser-style-dictionary
      nuxt.options.build.transpile.push('browser-style-dictionary')

      // Tokens dir resolver
      const tokensDir = withTrailingSlash(nuxt.options.buildDir + '/tokens')
      const { resolve: resolveTokensDirectory } = createResolver(tokensDir)

      // Expose rootDir to runtimeConfig
      runtimeConfig.tokensDir = tokensDir

      // Inject typings
      nuxt.hook('prepare:types', (opts) => {
        opts.references.push({ path: resolve(nuxt.options.buildDir, 'tokens/tokens.d.ts') })
      })

      // Push tokens handlers
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.handlers = nitroConfig.handlers || []

        nitroConfig.handlers.push({
          method: 'get',
          route: '/api/_theme/tokens/generate',
          handler: resolveRuntimeModule('./server/api/tokens/generate')
        })
      })

      try {
        await generateTokens(runtimeConfig.theme.tokens, tokensDir)
        logger.success('Tokens built succesfully!')
      } catch (e) {
        logger.error('Could not build tokens!')
        logger.error(e.message)
      }

      nuxt.options.alias = nuxt.options.alias || {}

      nuxt.options.alias['#tokens'] = resolveTokensDirectory('./tokens.ts')

      nuxt.options.alias['#tokens/types'] = resolveTokensDirectory('./tokens.d.ts')

      nuxt.options.css = nuxt.options.css || []

      nuxt.options.css.push(resolveTokensDirectory('./variables.css'))

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

      // Build
      const buildTokens = async () => await generateTokens(runtimeConfig.theme.tokens, tokensDir)
      nuxt.hook('build:before', buildTokens)

      // Development
      if (process?.dev) {
        nuxt.hook('builder:watch', async (_, path) => {
          const isTokenFile = privateConfig.tokensFilePaths.some(tokensFilePath => tokensFilePath.includes(path.replace('.js', '')) || tokensFilePath.includes(path.replace('.ts', '')))

          if (isTokenFile) {
            refreshTheme()
            await generateTokens(runtimeConfig.theme.tokens, tokensDir)
            logger.success('Tokens regenerated!')
          }
        })
      }
    }

    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolve(nuxt.options.buildDir, 'types/theme.d.ts') })
    })

    motd()
  }
})

interface ModulePublicRuntimeConfig {
  metas: NuxtThemeMeta[]
  defaults?: Omit<NuxtThemeConfig, 'metas' | 'tokens'>
}

interface ModulePrivateRuntimeConfig {
}

declare module '@nuxt/schema' {
  interface ConfigSchema {
    runtimeConfig: {
      public?: {
        theme?: ModulePublicRuntimeConfig;
        rootDir: string
      }
      private?: {
        theme?: ModulePrivateRuntimeConfig;
      }
    }
  }
}
