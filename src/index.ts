import type { Schema } from 'untyped'
// @ts-ignore
import type { ThemeOptions } from '#theme/types'
import '@nuxt/schema'

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
