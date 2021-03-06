import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  stub: false,
  entries: [
    {
      input: './src/index.ts',
      builder: 'rollup',
      name: 'index'
    }
  ],
  externals: [
    '#theme',
    'ufo',
    'jiti',
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
