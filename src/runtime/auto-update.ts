import type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarAutoUpdateOptions,
  PerfectScrollbarInstance,
} from './types'

const defaultAutoUpdate: Required<PerfectScrollbarAutoUpdateOptions> = {
  resize: true,
  mutation: false,
}

export function resolveAutoUpdateOptions(
  value: PerfectScrollbarAutoUpdate | undefined,
  fallback: PerfectScrollbarAutoUpdateOptions = defaultAutoUpdate,
): Required<PerfectScrollbarAutoUpdateOptions> {
  if (value === false) {
    return { resize: false, mutation: false }
  }
  if (value === true || typeof value === 'undefined') {
    return {
      resize: fallback.resize ?? defaultAutoUpdate.resize,
      mutation: fallback.mutation ?? defaultAutoUpdate.mutation,
    }
  }

  return {
    resize: value.resize ?? fallback.resize ?? defaultAutoUpdate.resize,
    mutation: value.mutation ?? fallback.mutation ?? defaultAutoUpdate.mutation,
  }
}

export function createPerfectScrollbarAutoUpdater(
  instance: PerfectScrollbarInstance,
  value?: PerfectScrollbarAutoUpdate,
  fallback?: PerfectScrollbarAutoUpdateOptions,
) {
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let frame: number | null = null
  const window = instance.element.ownerDocument.defaultView

  const schedule = () => {
    if (!instance.isAlive) {
      return
    }

    if (!window || typeof window.requestAnimationFrame !== 'function') {
      instance.update()
      return
    }

    if (frame !== null) {
      return
    }

    frame = window.requestAnimationFrame(() => {
      frame = null
      instance.update()
    })
  }

  const destroy = () => {
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    resizeObserver = null
    mutationObserver = null

    if (frame !== null && window && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frame)
      frame = null
    }
  }

  const apply = (nextValue?: PerfectScrollbarAutoUpdate) => {
    destroy()
    const options = resolveAutoUpdateOptions(nextValue, fallback)

    if (options.resize && window?.ResizeObserver) {
      resizeObserver = new window.ResizeObserver(schedule)
      resizeObserver.observe(instance.element)
    }

    if (options.mutation && window?.MutationObserver) {
      mutationObserver = new window.MutationObserver(schedule)
      mutationObserver.observe(instance.element, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }
  }

  apply(value)

  return {
    schedule,
    updateOptions: apply,
    destroy,
  }
}
