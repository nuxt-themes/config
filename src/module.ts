import {
  defineNuxtModule,
  createResolver,
  resolveModule,
  addTemplate
} from '@nuxt/kit'
import { NuxtThemeConfig, NuxtThemeMeta } from './types.d'
import { name, version, generateTyping, NuxtLayer, resolveTheme, motd } from './utils'

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
    }
  },
  setup (options, nuxt) {
    // Runtime resolver
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    nuxt.options.runtimeConfig.public.theme = {
      metas: [],
      defaultThemeConfig: {}
    }

    nuxt.hook('modules:done', () => {
      const layers = nuxt.options._layers

      const { metas, defaults: theme } = resolveTheme(layers as NuxtLayer[])

      console.log({ metas })

      addTemplate({
        filename: 'types/theme.d.ts',
        getContents: () => generateTyping(theme)
      })

      nuxt.options.runtimeConfig.public.theme.defaultThemeConfig = theme
    })

    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolve(nuxt.options.buildDir, 'types/theme.d.ts') })
    })

    motd()
  }
})

interface ModulePublicRuntimeConfig {
  metas: NuxtThemeMeta[]
  defaultThemeConfig?: Omit<NuxtThemeConfig, 'meta'>
}

interface ModulePrivateRuntimeConfig {
}

declare module '@nuxt/schema' {
  interface ConfigSchema {
    runtimeConfig: {
      public?: {
        theme?: ModulePublicRuntimeConfig;
      }
      private?: {
        theme?: ModulePrivateRuntimeConfig;
      }
    }
  }
}
