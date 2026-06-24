// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPerfectScrollbarAutoUpdater,
  resolveAutoUpdateOptions,
} from '../../src/runtime/auto-update'
import type { PerfectScrollbarInstance } from '../../src/runtime/types'

const originalWindowDescriptors = new Map<string, PropertyDescriptor | undefined>()

class ResizeObserverMock implements ResizeObserver {
  static instances: ResizeObserverMock[] = []

  readonly callback: ResizeObserverCallback
  readonly observed: Element[] = []
  disconnectCount = 0

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverMock.instances.push(this)
  }

  observe(target: Element) {
    this.observed.push(target)
  }

  unobserve(target: Element) {
    const index = this.observed.indexOf(target)
    if (index >= 0) {
      this.observed.splice(index, 1)
    }
  }

  disconnect() {
    this.disconnectCount++
    this.observed.length = 0
  }
}

class MutationObserverMock implements MutationObserver {
  static instances: MutationObserverMock[] = []

  readonly callback: MutationCallback
  observed: { target: Node, options?: MutationObserverInit } | null = null
  disconnectCount = 0

  constructor(callback: MutationCallback) {
    this.callback = callback
    MutationObserverMock.instances.push(this)
  }

  observe(target: Node, options?: MutationObserverInit) {
    this.observed = { target, options }
  }

  disconnect() {
    this.disconnectCount++
    this.observed = null
  }

  takeRecords(): MutationRecord[] {
    return []
  }
}

describe('perfect scrollbar auto update', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    ResizeObserverMock.instances = []
    MutationObserverMock.instances = []

    for (const [name, descriptor] of originalWindowDescriptors) {
      if (descriptor) {
        Object.defineProperty(window, name, descriptor)
      }
      else {
        Reflect.deleteProperty(window, name)
      }
    }
    originalWindowDescriptors.clear()
  })

  it('resolves defaults, fallbacks, and disabled observer config', () => {
    expect(resolveAutoUpdateOptions(undefined, { mutation: true })).toEqual({
      resize: true,
      mutation: true,
    })
    expect(resolveAutoUpdateOptions(false, { resize: true, mutation: true })).toEqual({
      resize: false,
      mutation: false,
    })
    expect(resolveAutoUpdateOptions({ resize: false }, { resize: true, mutation: true })).toEqual({
      resize: false,
      mutation: true,
    })
  })

  it('uses resize observation by default and schedules one animation-frame update', () => {
    let frame: FrameRequestCallback = () => {
      throw new Error('No animation frame was scheduled')
    }
    setWindowValue('ResizeObserver', ResizeObserverMock)
    setWindowValue('MutationObserver', MutationObserverMock)
    setWindowValue('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback
      return 1
    })
    setWindowValue('cancelAnimationFrame', vi.fn())
    const { instance, update } = createInstance()

    const updater = createPerfectScrollbarAutoUpdater(instance)

    expect(ResizeObserverMock.instances).toHaveLength(1)
    expect(MutationObserverMock.instances).toHaveLength(0)
    expect(ResizeObserverMock.instances[0]?.observed).toContain(instance.element)

    ResizeObserverMock.instances[0]?.callback([], ResizeObserverMock.instances[0])
    ResizeObserverMock.instances[0]?.callback([], ResizeObserverMock.instances[0])
    expect(update).not.toHaveBeenCalled()

    frame(0)
    expect(update).toHaveBeenCalledTimes(1)

    updater.destroy()
    expect(ResizeObserverMock.instances[0]?.disconnectCount).toBe(1)
  })

  it('updates synchronously when animation frames are unavailable', () => {
    setWindowValue('requestAnimationFrame', undefined)
    const { instance, update } = createInstance()

    const updater = createPerfectScrollbarAutoUpdater(instance, false)
    updater.schedule()

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('does not schedule updates after the instance is destroyed', () => {
    const { instance, update } = createInstance({
      isAlive: false,
    })

    const updater = createPerfectScrollbarAutoUpdater(instance, false)
    updater.schedule()

    expect(update).not.toHaveBeenCalled()
  })

  it('cancels a pending animation frame on destroy', () => {
    const cancelAnimationFrame = vi.fn()
    setWindowValue('requestAnimationFrame', () => 7)
    setWindowValue('cancelAnimationFrame', cancelAnimationFrame)
    const { instance } = createInstance()

    const updater = createPerfectScrollbarAutoUpdater(instance, false)
    updater.schedule()
    updater.destroy()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
  })

  it('keeps mutation observation opt-in and removes observers when disabled', () => {
    setWindowValue('ResizeObserver', ResizeObserverMock)
    setWindowValue('MutationObserver', MutationObserverMock)
    const { instance } = createInstance()

    const updater = createPerfectScrollbarAutoUpdater(instance, {
      resize: false,
      mutation: true,
    })

    expect(ResizeObserverMock.instances).toHaveLength(0)
    expect(MutationObserverMock.instances).toHaveLength(1)
    expect(MutationObserverMock.instances[0]?.observed).toEqual({
      target: instance.element,
      options: {
        childList: true,
        subtree: true,
        characterData: true,
      },
    })

    updater.updateOptions(false)

    expect(MutationObserverMock.instances[0]?.disconnectCount).toBe(1)
    expect(ResizeObserverMock.instances).toHaveLength(0)
    expect(MutationObserverMock.instances).toHaveLength(1)
  })
})

function setWindowValue(name: string, value: unknown) {
  if (!originalWindowDescriptors.has(name)) {
    originalWindowDescriptors.set(name, Object.getOwnPropertyDescriptor(window, name))
  }

  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value,
  })
}

function createInstance(overrides: Partial<PerfectScrollbarInstance> = {}) {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const update = vi.fn()
  const destroy = vi.fn()

  const instance: PerfectScrollbarInstance = {
    element,
    reach: { x: null, y: null },
    isAlive: true,
    scrollbarXActive: false,
    scrollbarYActive: false,
    update,
    destroy,
    ...overrides,
  }

  return { instance, update, destroy }
}
