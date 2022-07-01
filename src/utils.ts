import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
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

export const createThemeDir = async (path: string) => {
  if (!existsSync(path)) { await mkdir(path, { recursive: true }) }
}

/**
 * Make a list of `get()` compatible paths for any object
 */
export const objectPaths = (data: any) => {
  const output: any = []
  function step (obj: any, prev?: string) {
    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      const isarray = Array.isArray(value)
      const type = Object.prototype.toString.call(value)
      const isobject =
        type === '[object Object]' ||
        type === '[object Array]'

      const newKey = prev
        ? `${prev}.${key}`
        : key

      if (!output.includes(newKey)) { output.push(newKey) }

      if (!isarray && isobject && Object.keys(value).length) { return step(value, newKey) }
    })
  }
  step(data)
  return output
}

/**
 * Generate a typing declaration from the theme configuration.
 */
export const generateOptionsTyping = async (path: string, options: Partial<NuxtThemeOptions> = {}) => {
  let optionsType = generateTypes(resolveSchema(options), { addDefaults: true, allowExtraKeys: true, interfaceName: 'ThemeOptions' }) + '\n\n'

  optionsType = optionsType + `export type OptionsPaths = ${objectPaths(options).map(path => (`'${path}'`)).join(' | \n')}\n\n`

  await writeFile(path + 'options-types.d.ts', optionsType)

  let optionsTs = 'import { OptionsPaths, ThemeOptions } from \'./options-types\'\n\n'

  optionsTs = optionsTs + 'import get from \'lodash.get\'\n\n'

  optionsTs = optionsTs + `export const themeOptions: ThemeOptions = ${JSON.stringify(options, null, 2)}\n\n`

  optionsTs = optionsTs + 'export const $theme = (path: OptionsPaths) => get(themeOptions, path)\n\n'

  optionsTs = optionsTs + 'export * from \'./options-types.d\'\n'

  await writeFile(path + 'options.ts', optionsTs)

  let optionsJs = 'import get from \'lodash.get\'\n\n'

  optionsJs = optionsJs + `export const options = ${JSON.stringify(options, null, 2)}\n\n`

  optionsJs = optionsJs +
`/**
 * @typedef {import('options-types').OptionsPaths} OptionsPaths
 * @param {OptionsPaths} path
 */
export const $theme = (path) => get(options, path)\n\n`

  optionsJs = optionsJs + 'export default { options, $theme }\n'

  await writeFile(path + 'options.js', optionsJs)

  const indexTs = 'export * from \'./tokens.ts\'\n\nexport * from \'./options.ts\'\n'

  await writeFile(path + 'index.ts', indexTs)

  let indexDTs = 'import type { Ref } from \'vue\'\n\n'

  indexDTs = indexDTs + 'import { TokensPaths, ThemeTokens } from \'./tokens-types.d\'\n\n'

  indexDTs = indexDTs + 'import type { OptionsPaths, ThemeOptions } from \'./options-types.d\'\n\n'

  indexDTs = indexDTs + 'export * from \'./tokens-types.d\'\n\nexport * from \'./options-types.d\'\n\n'

  indexDTs = indexDTs +
`declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $dt: (path: Ref<TokensPaths> | TokensPaths, key: string = 'variable') => string
    $tokens: (path: Ref<TokensPaths> | TokensPaths, key: string = 'variable') => string
    $to: (path: Ref<OptionsPaths> | OptionsPaths) => any
    $theme: Ref<ThemeOptions>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $dt: (path: Ref<TokensPaths> | TokensPaths, key: string = 'variable') => string
    $tokens: (path: Ref<TokensPaths> | TokensPaths, key: string = 'variable') => string
    $to: (path: Ref<OptionsPaths> | OptionsPaths) => any
    $theme: Ref<ThemeOptions>
  }
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    theme?: Partial<NuxtThemeConfig>
  }
}\n`

  await writeFile(path + 'index.d.ts', indexDTs)
}
