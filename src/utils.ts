import { createDefu, defu } from 'defu'
import { resolve } from 'pathe'
import { generateTypes, resolveSchema } from 'untyped'
import chalk from 'chalk'
import { requireModule, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'
import type { NuxtThemeOptions, NuxtThemeTokens, NuxtThemeMeta, ModuleOptions } from './index'

export interface NuxtLayer {
  config: any
  configFile: string
  cwd: string
}

// Default options
export const MODULE_DEFAULTS: ModuleOptions = {
  meta: {
    name: 'My Nuxt Theme',
    description: 'My Nuxt Theme',
    author: '',
    motd: true
  },
  options: true,
  tokens: true
}

// Logging
export const logger = useLogger('theme')
export const pkgName = chalk.magentaBright(name)
export const motd = (metas: NuxtThemeMeta[]) => {
  logger.info(`${pkgName} v${version} enabled!`)
  metas.forEach(
    (meta) => {
      logger.info(`Using ${chalk.greenBright(meta.name)}${meta.author ? ` by ${chalk.greenBright(meta.author)}` : ''}`)
    }
  )
}

// Package datas
export { name, version }

/**
 * Options merging function built with defu.
 */
export const optionsMerger = createDefu((obj, key, value) => {
  // Arrays should overwrite and not be merged.
  if (obj[key] && Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

export const resolveConfig = (layer: NuxtLayer, key: string, configFile = `${key}.config`) => {
  const value = layer.config?.theme?.[key] || MODULE_DEFAULTS[key]
  let config = {}

  let filePath: string

  if (typeof value === 'boolean') {
    filePath = resolve(layer.cwd, configFile)
  } else if (typeof value === 'string') {
    filePath = resolve(layer.cwd, value)
  } else if (typeof value === 'object') {
    config = value
  }

  if (filePath) {
    try {
      const _tokensFile = requireModule(filePath, { clearCache: true })
      if (_tokensFile) { config = _tokensFile }
    } catch (_) {}
  }

  return { filePath, config }
}

/**
 * Resolve `theme` config layers from `extends` layers and merge them via `Object.assign()`.
 */
export const resolveTheme = (layers: NuxtLayer[]) => {
  const tokensFilePaths: string[] = []
  const optionsFilePaths: string[] = []
  const metas: NuxtThemeMeta[] = []
  let tokens = {} as NuxtThemeTokens
  let options = {} as NuxtThemeOptions

  const splitLayer = (layer: NuxtLayer) => {
    // Add metas to list
    // Leep trace of every theme used.
    if (layer.config?.theme?.meta) {
      metas.push(layer.config.theme.meta)
      delete layer.config.theme.meta
    }

    // Deeply merge layer options
    // Results in default options typings.
    if (layer.config?.theme?.options || MODULE_DEFAULTS.options) {
      const { config: layerOptions, filePath: _layerOptionsFilePath } = resolveConfig(layer, 'options', 'theme.config')

      if (_layerOptionsFilePath) { optionsFilePaths.push(_layerOptionsFilePath) }

      options = optionsMerger(options, layerOptions)
    }

    // Deeply merge tokens
    // In opposition to defaults, here arrays should also be merged.
    if (layer.config?.theme?.tokens || MODULE_DEFAULTS.tokens) {
      const { config: layerTokens, filePath: _layerTokensFilePath } = resolveConfig(layer, 'tokens', 'tokens.config')

      if (_layerTokensFilePath) { tokensFilePaths.push(_layerTokensFilePath) }

      tokens = defu(tokens, layerTokens)
    }
  }

  for (const layer of layers) { splitLayer(layer) }

  return { optionsFilePaths, tokensFilePaths, metas, tokens, options }
}

/**
 * Generate a typing declaration from the theme configuration.
 */
export const generateOptionsTyping = (options: Partial<NuxtThemeOptions>) => `${generateTypes(resolveSchema(options), { addDefaults: true, allowExtraKeys: true, interfaceName: 'ThemeOptions' })}\n\n`
