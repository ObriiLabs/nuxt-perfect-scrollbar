import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

export interface ModuleOptions {
  /**
   * Registers the client runtime plugin. Disable it when consumers only need
   * build-time assets or want to mount the scrollbar runtime manually.
   */
  enabled: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-perfect-scrollbar',
    configKey: 'perfectScrollbar',
  },
  defaults: {
    enabled: true,
  },
  setup(options) {
    if (!options.enabled) {
      return
    }

    const resolver = createResolver(import.meta.url)

    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'client',
    })
  },
})
