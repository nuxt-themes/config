import { createDefu, defu } from 'defu'
import { resolve } from 'pathe'
import { generateTypes, resolveSchema } from 'untyped'
import chalk from 'chalk'
import { requireModule, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'

export interface NuxtLayer {
  config: any
  configFile: string
  cwd: string
}

// Logging
export const logger = useLogger('nuxt-theme-kit')
export const pkgName = chalk.greenBright(name)
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

export const resolveTokens = (layer: NuxtLayer) => {
  const tokens = layer.config?.theme?.tokens
  let config = {}

  if (!layer.config?.theme?.tokens) { return {} }

  let tokensFilePath: string

  if (typeof tokens === 'boolean') {
    tokensFilePath = resolve(layer.cwd, 'tokens.config')
  } else if (typeof tokens === 'string') {
    tokensFilePath = resolve(layer.cwd, tokens)
  } else if (typeof tokens === 'object') {
    config = tokens
  }

  if (tokensFilePath) {
    const _tokensFile = requireModule(tokensFilePath, { clearCache: true })

    if (_tokensFile) { config = _tokensFile }
  }

  return { tokensFilePath, config }
}

/**
 * Resolve `theme` config layers from `extends` layers and merge them via `Object.assign()`.
 */
export const resolveTheme = (layers: NuxtLayer[]) => {
  const tokensFilePaths = []
  const metas = []
  let tokens = {}
  let defaults = {}

  for (const layer of layers) {
    if (layer.config.theme) {
      // Add metas to list
      // Leep trace of every theme used.
      if (layer.config.theme.meta) {
        metas.push(layer.config.theme.meta)
        delete layer.config.theme.meta
      }

      // Deeply merge tokens
      // In opposition to defaults, here arrays should also be merged.
      if (layer.config.theme.tokens) {
        const { config: layerTokens, tokensFilePath: _layerTokensFilePath } = resolveTokens(layer)

        if (_layerTokensFilePath) { tokensFilePaths.push(_layerTokensFilePath) }

        tokens = defu(tokens, layerTokens)
      }

      // Merge defaults
      defaults = themeMerger(defaults, layer.config.theme)
    }
  }

  return { tokensFilePaths, metas, tokens, defaults }
}

/**
 * Generate a typing declaration from the theme configuration.
 */
export const generateTyping = (theme) => {
  if (theme?.metas) { delete theme.metas }

  return `${generateTypes(resolveSchema(theme), { addDefaults: true, allowExtraKeys: true, interfaceName: 'NuxtThemeConfig' })}\n
declare module '@nuxt/schema' {
  interface NuxtConfig {
    theme: Partial<NuxtThemeConfig>
  }
}`
}
