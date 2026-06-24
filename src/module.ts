import {
  addComponent,
  addImports,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import type {
  PerfectScrollbarAutoUpdateOptions,
  PerfectScrollbarOptions,
} from './runtime/types'

export type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarAutoUpdateOptions,
  PerfectScrollbarDirectiveBinding,
  PerfectScrollbarHandlerName,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
  PerfectScrollbarReach,
  PerfectScrollbarReachEventDetail,
  PerfectScrollbarScrollEventDetail,
} from './runtime/types'

export interface ModuleOptions {
  /**
   * Registers the client runtime plugin, component, directive, composable, and
   * optional runtime styles.
   */
  enabled: boolean
  styles: boolean
  componentName: string
  directiveName: string
  defaultOptions: PerfectScrollbarOptions
  defaultAutoUpdate: PerfectScrollbarAutoUpdateOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-perfect-scrollbar',
    configKey: 'perfectScrollbar',
  },
  defaults: {
    enabled: true,
    styles: true,
    componentName: 'PerfectScrollbar',
    directiveName: 'perfect-scrollbar',
    defaultOptions: {},
    defaultAutoUpdate: {
      resize: true,
      mutation: false,
    },
  },
  setup(options, nuxt) {
    if (!options.enabled) {
      return
    }

    const resolver = createResolver(import.meta.url)
    const defaultAutoUpdate = {
      resize: options.defaultAutoUpdate.resize ?? true,
      mutation: options.defaultAutoUpdate.mutation ?? false,
    }

    nuxt.options.runtimeConfig.public.perfectScrollbar = {
      defaultOptions: options.defaultOptions,
      defaultAutoUpdate,
      directiveName: options.directiveName,
    }

    if (options.styles) {
      nuxt.options.css.push(resolver.resolve('./runtime/styles.css'))
    }

    addComponent({
      name: options.componentName,
      filePath: resolver.resolve('./runtime/components/PerfectScrollbar.vue'),
    })

    addImports({
      name: 'usePerfectScrollbar',
      as: 'usePerfectScrollbar',
      from: resolver.resolve('./runtime/composables/usePerfectScrollbar'),
    })

    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
    })
  },
})
