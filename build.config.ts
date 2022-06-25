import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    'browser-style-dictionary',
    'ufo',
    'pathe',
    'defu',
    'chalk',
    'ansi-styles',
    'supports-color',
    'has-flag',
    'color-convert',
    'color-name'
  ]
})
