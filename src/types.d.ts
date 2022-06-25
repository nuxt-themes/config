import type { DesignTokens } from 'browser-style-dictionary/types/browser'

export interface NuxtThemeMeta {
  name: string
  description?: string
  author?: string
  url?: string
  motd?: boolean
}

export interface NuxtThemeTokens extends DesignTokens {
}

export interface NuxtThemeConfig {
  meta: NuxtThemeMeta
  tokens: boolean | string | NuxtThemeTokens
  [key: any]: string
}
