import type { InjectionKey } from 'vue'
import type { PerfectScrollbarRuntimeConfig } from './types'

export const defaultRuntimeConfig: PerfectScrollbarRuntimeConfig = {
  defaultOptions: {},
  defaultAutoUpdate: {
    resize: true,
    mutation: false,
  },
  directiveName: 'perfect-scrollbar',
}

export const perfectScrollbarConfigKey: InjectionKey<PerfectScrollbarRuntimeConfig> = Symbol(
  'nuxt-perfect-scrollbar',
)
