// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { PerfectScrollbarEngine } from '../../src/runtime/engine'

interface Geometry {
  width: number
  height: number
  scrollWidth: number
  scrollHeight: number
}

const originalWindowDescriptors = new Map<string, PropertyDescriptor | undefined>()

describe('PerfectScrollbarEngine', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''

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

  it('creates rails and activates axes from element geometry', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 400,
    })

    const instance = new PerfectScrollbarEngine(element, {
      minScrollbarLength: 32,
    })

    expect(element.classList.contains('nps')).toBe(true)
    expect(element.querySelector('.nps__rail-x')).toBeTruthy()
    expect(element.querySelector('.nps__rail-y')).toBeTruthy()
    expect(instance.scrollbarXActive).toBe(true)
    expect(instance.scrollbarYActive).toBe(true)
    expect(instance.scrollbarYHeight).toBeGreaterThanOrEqual(32)
  })

  it('updates active axes after content geometry changes', () => {
    const geometry = {
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 100,
    }
    const element = createScrollableElement(geometry)
    const instance = new PerfectScrollbarEngine(element)

    expect(instance.scrollbarYActive).toBe(false)

    geometry.scrollHeight = 500
    instance.update()

    expect(instance.scrollbarYActive).toBe(true)
    expect(element.classList.contains('nps--active-y')).toBe(true)
  })

  it('honors axis suppression and max thumb length', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 150,
    })

    const instance = new PerfectScrollbarEngine(element, {
      maxScrollbarLength: 30,
      suppressScrollX: true,
    })

    expect(instance.scrollbarXActive).toBe(false)
    expect(element.classList.contains('nps--active-x')).toBe(false)
    expect(instance.scrollbarYActive).toBe(true)
    expect(instance.scrollbarYHeight).toBe(30)
  })

  it('cleans up DOM and classes on destroy', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 400,
    })
    const instance = new PerfectScrollbarEngine(element)

    instance.destroy()

    expect(instance.isAlive).toBe(false)
    expect(element.className).toBe('')
    expect(element.querySelector('.nps__rail-x')).toBeNull()
    expect(element.querySelector('.nps__rail-y')).toBeNull()
  })

  it('preserves user nps-prefixed classes on destroy', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 400,
    })
    element.classList.add('nps-theme-admin')
    const instance = new PerfectScrollbarEngine(element)

    instance.destroy()

    expect(element.className).toBe('nps-theme-admin')
  })

  it('keeps scrolling state independent across multiple instances', () => {
    vi.useFakeTimers()
    const first = new PerfectScrollbarEngine(createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 400,
    }))
    const second = new PerfectScrollbarEngine(createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 400,
    }))

    first.element.scrollTop = 20
    first.element.dispatchEvent(new Event('scroll'))
    second.element.scrollTop = 30
    second.element.dispatchEvent(new Event('scroll'))

    expect(first.element.classList.contains('nps--scrolling-y')).toBe(true)
    expect(second.element.classList.contains('nps--scrolling-y')).toBe(true)

    first.destroy()
    vi.advanceTimersByTime(1000)

    expect(first.element.classList.contains('nps--scrolling-y')).toBe(false)
    expect(second.element.classList.contains('nps--scrolling-y')).toBe(false)
  })

  it('does not consume wheel events while a nested child can still scroll', () => {
    const parent = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    const child = document.createElement('div')
    child.style.overflowY = 'auto'
    parent.appendChild(child)
    defineGeometry(child, {
      width: 100,
      height: 50,
      scrollWidth: 100,
      scrollHeight: 200,
    })
    child.scrollTop = 20
    new PerfectScrollbarEngine(parent)

    child.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 20,
    }))

    expect(parent.scrollTop).toBe(0)
  })

  it('applies wheel speed and prevents default while scrolling the owner element', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    new PerfectScrollbarEngine(element, {
      wheelSpeed: 2,
    })
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 12,
    })

    element.dispatchEvent(event)

    expect(element.scrollTop).toBe(24)
    expect(event.defaultPrevented).toBe(true)
  })

  it('maps vertical wheel input to horizontal scrolling with both wheel axes', () => {
    const element = createScrollableElement({
      width: 100,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 100,
    })
    new PerfectScrollbarEngine(element, {
      useBothWheelAxes: true,
    })
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 18,
    })

    element.dispatchEvent(event)

    expect(element.scrollLeft).toBe(18)
    expect(event.defaultPrevented).toBe(true)
  })

  it('lets wheel events propagate at scroll edges when propagation is enabled', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    new PerfectScrollbarEngine(element, {
      wheelPropagation: true,
    })
    element.scrollTop = 400
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 20,
    })

    element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('prevents wheel events at scroll edges when propagation is disabled', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    new PerfectScrollbarEngine(element, {
      wheelPropagation: false,
    })
    element.scrollTop = 400
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 20,
    })

    element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('scrolls by one viewport when clicking a rail', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    const instance = new PerfectScrollbarEngine(element)

    instance.scrollbarYRail.dispatchEvent(createPageMouseEvent('mousedown', {
      pageY: 80,
    }))

    expect(element.scrollTop).toBe(100)
  })

  it('drags the vertical thumb and cleans document listeners on mouseup', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    const instance = new PerfectScrollbarEngine(element)

    instance.scrollbarY.dispatchEvent(createPageMouseEvent('mousedown', {
      pageY: 0,
    }))
    document.dispatchEvent(createPageMouseEvent('mousemove', {
      pageY: 10,
    }))

    expect(element.scrollTop).toBeGreaterThan(0)
    expect(element.classList.contains('nps--dragging-y')).toBe(true)

    document.dispatchEvent(createPageMouseEvent('mouseup'))

    expect(element.classList.contains('nps--dragging-y')).toBe(false)
    expect(instance.scrollbarYRail.classList.contains('nps--rail-dragging')).toBe(false)
  })

  it('scrolls with keyboard input when a thumb is focused', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    const instance = new PerfectScrollbarEngine(element)

    instance.scrollbarY.focus()
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'PageDown',
    })
    document.dispatchEvent(event)

    expect(element.scrollTop).toBe(100)
    expect(event.defaultPrevented).toBe(true)
  })

  it('handles pointer touch move and swipe easing', () => {
    vi.useFakeTimers()
    setWindowValue('PointerEvent', Event)
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 200,
      scrollHeight: 500,
    })
    new PerfectScrollbarEngine(element)

    element.dispatchEvent(createPointerEvent('pointerdown', {
      pageY: 100,
      pointerType: 'touch',
    }))
    vi.advanceTimersByTime(20)
    element.dispatchEvent(createPointerEvent('pointermove', {
      pageY: 80,
      pointerType: 'touch',
    }))

    expect(element.scrollTop).toBe(20)

    element.dispatchEvent(createPointerEvent('pointerup', {
      pageY: 80,
      pointerType: 'touch',
    }))
    vi.advanceTimersByTime(10)

    expect(element.scrollTop).toBeGreaterThan(20)
  })

  it('marks rtl containers and keeps horizontal geometry active', () => {
    const element = createScrollableElement({
      width: 200,
      height: 100,
      scrollWidth: 500,
      scrollHeight: 100,
    })
    element.style.direction = 'rtl'

    const instance = new PerfectScrollbarEngine(element)

    expect(element.classList.contains('nps--rtl')).toBe(true)
    expect(instance.scrollbarXActive).toBe(true)
  })
})

function createScrollableElement(geometry: Geometry) {
  const element = document.createElement('div')
  document.body.appendChild(element)
  defineGeometry(element, geometry)
  return element
}

function defineGeometry(element: HTMLElement, geometry: Geometry) {
  Object.defineProperties(element, {
    clientWidth: {
      configurable: true,
      get: () => geometry.width,
    },
    clientHeight: {
      configurable: true,
      get: () => geometry.height,
    },
    offsetWidth: {
      configurable: true,
      get: () => geometry.width,
    },
    offsetHeight: {
      configurable: true,
      get: () => geometry.height,
    },
    scrollWidth: {
      configurable: true,
      get: () => geometry.scrollWidth,
    },
    scrollHeight: {
      configurable: true,
      get: () => geometry.scrollHeight,
    },
  })
  element.getBoundingClientRect = () => ({
    width: geometry.width,
    height: geometry.height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: geometry.width,
    bottom: geometry.height,
    toJSON: () => ({}),
  })
}

function createPageMouseEvent(
  type: string,
  position: { pageX?: number, pageY?: number } = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
  })

  Object.defineProperties(event, {
    pageX: {
      configurable: true,
      value: position.pageX ?? 0,
    },
    pageY: {
      configurable: true,
      value: position.pageY ?? 0,
    },
  })

  return event
}

function createPointerEvent(
  type: string,
  position: { pageX?: number, pageY?: number, pointerType: string },
) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as PointerEvent

  Object.defineProperties(event, {
    pageX: {
      configurable: true,
      value: position.pageX ?? 0,
    },
    pageY: {
      configurable: true,
      value: position.pageY ?? 0,
    },
    pointerType: {
      configurable: true,
      value: position.pointerType,
    },
    buttons: {
      configurable: true,
      value: 1,
    },
  })

  return event
}

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
