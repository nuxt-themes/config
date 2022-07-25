import type { Schema } from 'untyped'
import jiti from 'jiti'
import { resolveModule } from '@nuxt/kit'
import type { ThemeOptions, OptionsPaths } from '#theme'

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T;

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

export interface NuxtThemeConfig {
  meta?: NuxtThemeMeta
  options?: NuxtThemeOptions | boolean | string
}

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
  optionsFilePaths?: Array<string>
  schema?: Schema
}

export const defineTheme = (options: DeepPartial<NuxtThemeOptions>): DeepPartial<NuxtThemeOptions> => options

export const defineSchema = (schema: Schema) => schema

export const $theme = (path: OptionsPaths) => {
  const module = resolveModule(`${globalThis.__nuxtThemeBuildDir__}index.ts`)

  const { $t } = jiti(import.meta.url)(module)

  const fail = () => {
    // eslint-disable-next-line no-console
    console.log(`Could not find the token ${path}!`)
  }

  return $t(path) || fail()
}

export const $t = $theme

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    // @ts-ignore
    theme?: ModulePublicRuntimeConfig;
  }

  interface RuntimeConfig {
    // @ts-ignore
    theme?: ModulePrivateRuntimeConfig;
  }

  interface NuxtConfig {
    // @ts-ignore
    theme?: Partial<ModuleOptions>
  }

  interface NuxtOptions {
    // @ts-ignore
    theme?: ModuleOptions
  }
}
