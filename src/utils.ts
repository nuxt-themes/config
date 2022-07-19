import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { defu, createDefu } from 'defu'
import { resolve } from 'pathe'
import { generateTypes, resolveSchema } from 'untyped'
import type { Schema } from 'untyped'
import chalk from 'chalk'
import { requireModule, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'
import type { NuxtThemeOptions, NuxtThemeMeta, ModuleOptions } from './index'

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
  options: true
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
export const defuMerger = createDefu((obj, key, value) => {
  // Arrays should overwrite and not be merged.
  if (obj[key] && Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

export const resolveConfig = (layer: NuxtLayer, key: string, configFile = `${key}.config`) => {
  const value = layer.config?.theme?.[key] || MODULE_DEFAULTS[key]
  let config = {}
  let schema = {}

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
      const _file = requireModule(filePath, { clearCache: true, interopDefault: false })
      if (_file.schema) { schema = _file.schema }
      delete _file.schema
      if (_file) { config = _file }
    } catch (_) {}
  }

  return { filePath, config, schema }
}

/**
 * Resolve `theme` config layers from `extends` layers and merge them via `Object.assign()`.
 */
export const resolveTheme = (layers: NuxtLayer[]) => {
  const optionsFilePaths: string[] = []
  const metas: NuxtThemeMeta[] = []
  let options = {} as NuxtThemeOptions
  let schema = {} as NuxtThemeOptions

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
      const { config: layerOptions, schema: layerSchema, filePath: _layerOptionsFilePath } = resolveConfig(layer, 'options', 'theme.config')

      if (_layerOptionsFilePath) { optionsFilePaths.push(_layerOptionsFilePath) }

      options = defuMerger(options, layerOptions)

      schema = defuMerger(schema, layerSchema)
    }
  }

  for (const layer of layers) { splitLayer(layer) }

  return { optionsFilePaths, metas, options, schema }
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
export const generateOptionsTyping = async (path: string, schema: Schema, options: Partial<NuxtThemeOptions> = {}) => {
  /**
   * types.d.ts
   */

  let typesTs = 'import type { Ref } from \'vue\'\n\n'

  // Resolve options schema from object declaration and `schema` export if it exists
  const optionsSchema = defu(schema, resolveSchema(options))

  const typing = generateTypes(optionsSchema, { addDefaults: true, allowExtraKeys: true, interfaceName: 'ThemeOptions' })

  typesTs = typesTs + typing + '\n\n'

  typesTs = typesTs + `export type OptionsPaths = ${objectPaths(options).map(path => (`'${path}'`)).join(' | \n')}\n\n`

  typesTs = typesTs +
`declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $to: (path: Ref<OptionsPaths> | OptionsPaths) => any
    $theme: Ref<ThemeOptions>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $to: (path: Ref<OptionsPaths> | OptionsPaths) => any
    $theme: Ref<ThemeOptions>
  }
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    theme?: Partial<NuxtThemeConfig>
  }
}\n`

  await writeFile(path + 'types.d.ts', typesTs)

  /**
   * index.ts
   */

  let indexTs = 'import { OptionsPaths, ThemeOptions } from \'./types\'\n\n'

  indexTs = indexTs + 'import get from \'lodash.get\'\n\n'

  indexTs = indexTs + `export const options: ThemeOptions = ${JSON.stringify(options, null, 2)}\n\n`

  indexTs = indexTs + 'export const $theme = (path: OptionsPaths) => get(options, path)\n\n'

  indexTs = indexTs + 'export * from \'./options-types.d\'\n'

  await writeFile(path + 'index.ts', indexTs)

  /**
   * index.js
   */

  let indexJs = 'import get from \'lodash.get\'\n\n'

  indexJs = indexJs + `export const options = ${JSON.stringify(options, null, 2)}\n\n`

  indexJs = indexJs +
`/**
 * @typedef {import('options-types').OptionsPaths} OptionsPaths
 * @param {OptionsPaths} path
 */
export const $theme = (path) => get(options, path)\n\n`

  indexJs = indexJs + 'export default { options, $theme }\n'

  await writeFile(path + 'index.js', indexJs)
}
