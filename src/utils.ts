import { createDefu } from 'defu'
import { generateTypes, resolveSchema } from 'untyped'
import { greenBright } from 'chalk'
import { useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'

export interface NuxtLayer {
  config: any
  configFile: string
  cwd: string
}

// Logging
export const logger = useLogger('nuxt-theme-kit')
export const pkgName = greenBright(name)
export const motd = () => logger.success(`Using ${pkgName} v${version}`)

// Package datas
export { name, version }

/**
 * Theme merging function built with defu.
 */
export const themeMerger = createDefu((obj, key, value) => {
  // Arrays should overwrite and not be merged.
  if (obj[key] && Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

/**
 * Resolve `theme` config layers from `extends` layers and merge them via `Object.assign()`.
 */
export const resolveTheme = (layers: NuxtLayer[]) => {
  const metas = []
  let defaults = {}

  for (const layer of layers) {
    if (layer.config.theme) {
      // Merge defaults
      defaults = themeMerger(defaults, layer.config.theme)

      // Add metas to list ; keep trace of every theme used.
      if (layer.config.theme.meta) {
        metas.push(layer.config.theme.meta)
      }
    }
  }

  return { metas, defaults }
}

/**
 * Generate a typing declaration from the theme configuration.
 */
export const generateTyping = (theme) => {
  if (theme?.meta) { delete theme.meta }

  return `${generateTypes(resolveSchema(theme), { addDefaults: true, allowExtraKeys: true, interfaceName: 'NuxtThemeConfig' })}\n
declare module '@nuxt/schema' {
  interface NuxtConfig {
    theme: Partial<NuxtThemeConfig>
  }
}`
}
