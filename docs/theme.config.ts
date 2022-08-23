import { defineTheme } from '../src'

export default defineTheme({
  title: 'Nuxt Themes',
  description: 'Toolkit for authoring Nuxt Themes.',
  url: 'https://nuxt-themes.netlify.app',
  debug: false,
  socials: {
    twitter: '@yaeeelglx',
    github: 'nuxt-themes/config'
  },
  github: {
    root: 'docs/content',
    edit: true,
    releases: true
  },
  aside: {
    level: 0
  },
  header: {
    title: 'Nuxt Themes',
    logo: false
  },
  footer: {
    credits: {
      icon: 'IconDocus',
      text: 'Powered by Docus',
      href: 'https://docus.com'
    },
    icons: [
      {
        label: 'NuxtJS',
        href: 'https://nuxtjs.org',
        component: 'IconNuxt'
      },
      {
        label: 'Vue Telescope',
        href: 'https://vuetelescope.com',
        component: 'IconVueTelescope'
      }
    ]
  }
})
