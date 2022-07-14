<template>
  <div
    class="app flex flex-col bg-lila text-lavender relative overflow-y-auto"
  >
    <header v-if="$theme.value.header" class="flex items-center px-8 py-4 sticky top-0 w-full bg-black z-50">
      <span class="font-bold">
        {{ $theme.value.header?.text || 'My Theme' }}
      </span>
    </header>

    <div
      class="flex-1 rounded-lg relative z-0 p-8 overflow-y-auto"
    >
      <p class="flex items-center justify-center w-64 h-64 bg-primary-500 rounded-xl rounded-lg ring-4 ring-black">
        Primary
      </p>
      <p class="flex items-center justify-center w-64 h-64 bg-black rounded-xl mt-8 rounded-lg ring-4 ring-black">
        Black
      </p>
      <p class="flex items-center justify-center w-64 h-64 bg-grape rounded-xl mt-8 rounded-lg ring-4 ring-black">
        Grape
      </p>
      <p class="text-black flex items-center justify-center w-64 h-64 bg-lavender rounded-xl mt-8 rounded-lg ring-4 ring-black">
        Lavender
      </p>
      <p class="flex items-center justify-center w-64 h-64 bg-velvet-500 rounded-xl mt-8 rounded-lg ring-4 ring-black">
        Velvet
      </p>
    </div>

    <footer v-if="$theme.value.footer" class="flex justify-between items-center px-8 py-4 sticky top-0 w-full bg-black z-50">
      <span class="font-bold">
        {{ $theme.value.footer?.text || 'Footer' }}
      </span>

      <span v-if="$theme.value.credits" class="font-semibold">{{ $theme.value.credits.text }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
const theme = useTheme()
// eslint-disable-next-line no-console
console.log(theme.value)
</script>

<style scoped lang="postcss">
.app {
  height: 100vh;
  width: 100vw;
}
</style>
