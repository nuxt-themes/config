import {
  defineNuxtModule,
  createResolver,
  resolveModule
} from '@nuxt/kit'
import { name, version } from '../package.json'

export interface ModuleOptions {
  // Module options
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
  },
  setup (options, nuxt) {
    // Runtime resolver
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    console.log('Hello World')
  }
})

interface ModulePublicRuntimeConfig {
}

interface ModulePrivateRuntimeConfig {
}

declare module '@nuxt/schema' {
  interface ConfigSchema {
    runtimeConfig: {
      public?: {
        content?: ModulePublicRuntimeConfig;
      }
      private?: {
        content?: ModulePrivateRuntimeConfig;
      }
    }
  }
}
