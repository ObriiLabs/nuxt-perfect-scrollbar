import type { Directive, DirectiveBinding } from 'vue'
import { createPerfectScrollbarAutoUpdater } from '../auto-update'
import { defaultRuntimeConfig } from '../config'
import { PerfectScrollbarEngine } from '../engine'
import type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarDirectiveBinding,
  PerfectScrollbarOptions,
  PerfectScrollbarRuntimeConfig,
} from '../types'

interface DirectiveState {
  instance: PerfectScrollbarEngine
  updater: ReturnType<typeof createPerfectScrollbarAutoUpdater>
  theme: string | null
  snapshot: DirectiveSnapshot
}

interface DirectiveSnapshot {
  disabled: boolean
  theme: string | null
  options: PerfectScrollbarOptions
  autoUpdate: PerfectScrollbarAutoUpdate | undefined
}

const states = new WeakMap<HTMLElement, DirectiveState>()

export function createPerfectScrollbarDirective(
  config: PerfectScrollbarRuntimeConfig = defaultRuntimeConfig,
): Directive<HTMLElement, PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined> {
  return {
    getSSRProps() {
      return {}
    },
    mounted(element, binding) {
      mount(element, binding, config)
    },
    updated(element, binding) {
      const value = normalizeDirectiveBinding(binding.value)
      const state = states.get(element)
      const snapshot = createDirectiveSnapshot(value)

      if (value.disabled) {
        destroy(element)
        return
      }

      if (!state || !areDirectiveSnapshotsEqual(state.snapshot, snapshot)) {
        destroy(element)
        mountValue(element, value, config, snapshot)
        return
      }

      state.updater.schedule()
    },
    beforeUnmount(element) {
      destroy(element)
    },
  }
}

function mount(
  element: HTMLElement,
  binding: DirectiveBinding<PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined>,
  config: PerfectScrollbarRuntimeConfig,
) {
  const value = normalizeDirectiveBinding(binding.value)
  const snapshot = createDirectiveSnapshot(value)
  mountValue(element, value, config, snapshot)
}

function mountValue(
  element: HTMLElement,
  value: PerfectScrollbarDirectiveBinding,
  config: PerfectScrollbarRuntimeConfig,
  snapshot: DirectiveSnapshot,
) {
  if (value.disabled) {
    return
  }

  applyTheme(element, null, value.theme ?? null)
  const instance = new PerfectScrollbarEngine(element, {
    ...config.defaultOptions,
    ...(value.options ?? {}),
  })
  const updater = createPerfectScrollbarAutoUpdater(
    instance,
    value.autoUpdate,
    config.defaultAutoUpdate,
  )

  states.set(element, {
    instance,
    updater,
    theme: value.theme ?? null,
    snapshot,
  })
  value.onReady?.(instance)
}

function destroy(element: HTMLElement) {
  const state = states.get(element)
  if (!state) {
    return
  }

  state.updater.destroy()
  state.instance.destroy()
  applyTheme(element, state.theme, null)
  states.delete(element)
}

function normalizeDirectiveBinding(
  value: PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined,
): PerfectScrollbarDirectiveBinding {
  if (!value) {
    return {}
  }

  if ('options' in value || 'autoUpdate' in value || 'disabled' in value || 'theme' in value || 'onReady' in value) {
    return value as PerfectScrollbarDirectiveBinding
  }

  return { options: value as PerfectScrollbarOptions }
}

function applyTheme(element: HTMLElement, previousTheme: string | null, nextTheme: string | null) {
  if (previousTheme) {
    element.classList.remove(`nps-theme-${previousTheme}`)
  }
  if (nextTheme) {
    element.classList.add(`nps-theme-${nextTheme}`)
  }
}

function createDirectiveSnapshot(value: PerfectScrollbarDirectiveBinding): DirectiveSnapshot {
  return {
    disabled: Boolean(value.disabled),
    theme: value.theme ?? null,
    options: cloneOptions(value.options),
    autoUpdate: cloneAutoUpdate(value.autoUpdate),
  }
}

function cloneOptions(options: PerfectScrollbarOptions | undefined): PerfectScrollbarOptions {
  return {
    ...(options ?? {}),
    ...(options?.handlers ? { handlers: [...options.handlers] } : {}),
  }
}

function cloneAutoUpdate(
  autoUpdate: PerfectScrollbarAutoUpdate | undefined,
): PerfectScrollbarAutoUpdate | undefined {
  if (autoUpdate && typeof autoUpdate === 'object') {
    return { ...autoUpdate }
  }

  return autoUpdate
}

function areDirectiveSnapshotsEqual(left: DirectiveSnapshot, right: DirectiveSnapshot) {
  return left.disabled === right.disabled
    && left.theme === right.theme
    && areAutoUpdateValuesEqual(left.autoUpdate, right.autoUpdate)
    && areOptionsEqual(left.options, right.options)
}

function areAutoUpdateValuesEqual(
  left: PerfectScrollbarAutoUpdate | undefined,
  right: PerfectScrollbarAutoUpdate | undefined,
) {
  if (left === right) {
    return true
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false
  }

  return left.resize === right.resize && left.mutation === right.mutation
}

function areOptionsEqual(left: PerfectScrollbarOptions, right: PerfectScrollbarOptions) {
  return left.maxScrollbarLength === right.maxScrollbarLength
    && left.minScrollbarLength === right.minScrollbarLength
    && left.scrollingThreshold === right.scrollingThreshold
    && left.scrollXMarginOffset === right.scrollXMarginOffset
    && left.scrollYMarginOffset === right.scrollYMarginOffset
    && left.suppressScrollX === right.suppressScrollX
    && left.suppressScrollY === right.suppressScrollY
    && left.swipeEasing === right.swipeEasing
    && left.useBothWheelAxes === right.useBothWheelAxes
    && left.wheelPropagation === right.wheelPropagation
    && left.wheelSpeed === right.wheelSpeed
    && areHandlersEqual(left.handlers, right.handlers)
}

function areHandlersEqual(
  left: PerfectScrollbarOptions['handlers'],
  right: PerfectScrollbarOptions['handlers'],
) {
  if (left === right) {
    return true
  }
  if (!left || !right || left.length !== right.length) {
    return false
  }

  return left.every((handler, index) => handler === right[index])
}
