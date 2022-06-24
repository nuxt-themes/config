export interface NuxtThemeMeta {
  name: string
  description?: string
  author?: string
  url?: string
  motd?: boolean
}

export interface NuxtThemeConfig {
  meta: NuxtThemeMeta
  [key: any]: string
}
