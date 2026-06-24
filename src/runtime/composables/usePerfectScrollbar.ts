import {
  computed,
  inject,
  isRef,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { createPerfectScrollbarAutoUpdater } from '../auto-update'
import { perfectScrollbarConfigKey, defaultRuntimeConfig } from '../config'
import { PerfectScrollbarEngine } from '../engine'
import type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarAutoUpdateOptions,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
} from '../types'

export interface UsePerfectScrollbarOptions {
  options?: MaybeRefOrGetter<PerfectScrollbarOptions | undefined>
  autoUpdate?: MaybeRefOrGetter<PerfectScrollbarAutoUpdate | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface PerfectScrollbarAutoUpdater {
  schedule: () => void
  updateOptions: (value?: PerfectScrollbarAutoUpdate) => void
  destroy: () => void
}

export function usePerfectScrollbar(
  target?: Ref<HTMLElement | null> | MaybeRefOrGetter<HTMLElement | null>,
  options: UsePerfectScrollbarOptions = {},
) {
  const injectedConfig = inject(perfectScrollbarConfigKey, defaultRuntimeConfig)
  const element = normalizeTarget(target)
  const instance = shallowRef<PerfectScrollbarInstance | null>(null)
  const updater = shallowRef<PerfectScrollbarAutoUpdater | null>(null)

  const isReady = computed(() => Boolean(instance.value?.isAlive))
  const reach = computed(() => instance.value?.reach ?? { x: null, y: null })

  const resolveOptions = () => ({
    ...injectedConfig.defaultOptions,
    ...(toValue(options.options) ?? {}),
  })

  const resolveAutoUpdate = (): {
    value: PerfectScrollbarAutoUpdate | undefined
    fallback: PerfectScrollbarAutoUpdateOptions
  } => ({
    value: toValue(options.autoUpdate),
    fallback: injectedConfig.defaultAutoUpdate,
  })

  const destroy = () => {
    updater.value?.destroy()
    updater.value = null
    instance.value?.destroy()
    instance.value = null
  }

  const init = () => {
    if (!element.value || toValue(options.disabled)) {
      destroy()
      return
    }

    destroy()
    const nextInstance = new PerfectScrollbarEngine(element.value, resolveOptions())
    const autoUpdate = resolveAutoUpdate()
    instance.value = nextInstance
    updater.value = createPerfectScrollbarAutoUpdater(
      nextInstance,
      autoUpdate.value,
      autoUpdate.fallback,
    )
  }

  const update = () => {
    instance.value?.update()
  }

  const scheduleUpdate = () => {
    if (updater.value) {
      updater.value.schedule()
      return
    }
    update()
  }

  onMounted(async () => {
    await nextTick()
    init()
  })

  onBeforeUnmount(() => {
    destroy()
  })

  watch(
    () => [
      element.value,
      toValue(options.disabled),
      toValue(options.options),
      toValue(options.autoUpdate),
    ],
    async () => {
      await nextTick()
      init()
    },
    { deep: true },
  )

  return {
    element,
    instance,
    isReady,
    reach,
    update,
    scheduleUpdate,
    destroy,
  }
}

function normalizeTarget(target?: Ref<HTMLElement | null> | MaybeRefOrGetter<HTMLElement | null>) {
  if (!target) {
    return ref<HTMLElement | null>(null)
  }

  if (isRef(target)) {
    return target
  }

  return computed(() => toValue(target))
}
