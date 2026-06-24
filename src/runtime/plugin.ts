import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { perfectScrollbarConfigKey, defaultRuntimeConfig } from './config'
import { createPerfectScrollbarDirective } from './directives/perfect-scrollbar'
import type { PerfectScrollbarRuntimeConfig } from './types'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const perfectScrollbarConfig = resolveRuntimeConfig(
    runtimeConfig.public.perfectScrollbar as Partial<PerfectScrollbarRuntimeConfig> | undefined,
  )

  nuxtApp.vueApp.provide(perfectScrollbarConfigKey, perfectScrollbarConfig)
  nuxtApp.vueApp.directive(
    perfectScrollbarConfig.directiveName,
    createPerfectScrollbarDirective(perfectScrollbarConfig),
  )
})

function resolveRuntimeConfig(
  config: Partial<PerfectScrollbarRuntimeConfig> | undefined,
): PerfectScrollbarRuntimeConfig {
  return {
    defaultOptions: {
      ...defaultRuntimeConfig.defaultOptions,
      ...(config?.defaultOptions ?? {}),
    },
    defaultAutoUpdate: {
      ...defaultRuntimeConfig.defaultAutoUpdate,
      ...(config?.defaultAutoUpdate ?? {}),
    },
    directiveName: config?.directiveName ?? defaultRuntimeConfig.directiveName,
  }
}
