import { fileURLToPath } from 'url'
import { describe, test, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Basic usage', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    server: true
  })

  test('Fetch index', async () => {
    const content = await $fetch('/')

    // Normal Prop
    expect(content).includes('Hello World')
  })
})
