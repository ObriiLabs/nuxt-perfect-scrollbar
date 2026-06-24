// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { ObjectDirective } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PerfectScrollbar from '../../src/runtime/components/PerfectScrollbar.vue'
import { usePerfectScrollbar } from '../../src/runtime/composables/usePerfectScrollbar'
import { createPerfectScrollbarDirective } from '../../src/runtime/directives/perfect-scrollbar'
import type {
  PerfectScrollbarDirectiveBinding,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
} from '../../src/runtime/types'

describe('Vue runtime API', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts the component client-side and emits ready', async () => {
    const wrapper = mount(PerfectScrollbar, {
      props: {
        disabled: true,
      },
      slots: {
        default: '<div>content</div>',
      },
      attachTo: document.body,
    })
    defineGeometry(wrapper.element as HTMLElement)

    await wrapper.setProps({ disabled: false })
    await nextTick()

    expect(wrapper.element.classList.contains('nps')).toBe(true)
    expect(wrapper.emitted('ready')).toHaveLength(1)

    wrapper.unmount()
    expect(wrapper.emitted('destroy')).toHaveLength(1)
  })

  it('forwards component scroll, reach, and update events', async () => {
    const wrapper = mount(PerfectScrollbar, {
      props: {
        disabled: true,
      },
      slots: {
        default: '<div>content</div>',
      },
      attachTo: document.body,
    })
    defineGeometry(wrapper.element as HTMLElement)

    await wrapper.setProps({ disabled: false })
    await nextTick()

    const instance = wrapper.emitted('ready')?.[0]?.[0] as PerfectScrollbarInstance
    ;(wrapper.element as HTMLElement).scrollTop = 300
    wrapper.element.dispatchEvent(new Event('scroll'))
    instance.update()

    expect(wrapper.emitted('scroll')).toHaveLength(1)
    expect(wrapper.emitted('scroll')?.[0]?.[0]).toMatchObject({
      axis: 'y',
      direction: 'down',
      reach: 'end',
    })
    expect(wrapper.emitted('reach')?.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('update')).toHaveLength(1)
  })

  it('destroys and recreates the component instance when disabled changes', async () => {
    const wrapper = mount(PerfectScrollbar, {
      props: {
        disabled: true,
      },
      slots: {
        default: '<div>content</div>',
      },
      attachTo: document.body,
    })
    defineGeometry(wrapper.element as HTMLElement)

    await wrapper.setProps({ disabled: false })
    await nextTick()
    await nextTick()

    expect(wrapper.element.classList.contains('nps')).toBe(true)
    expect(wrapper.emitted('ready')).toHaveLength(1)

    await wrapper.setProps({ disabled: true })
    await nextTick()
    await nextTick()

    expect(wrapper.element.classList.contains('nps')).toBe(false)
    expect(wrapper.emitted('destroy')).toHaveLength(1)

    await wrapper.setProps({ disabled: false })
    await nextTick()
    await nextTick()

    expect(wrapper.element.classList.contains('nps')).toBe(true)
    expect(wrapper.emitted('ready')).toHaveLength(2)
  })

  it('creates and destroys an instance from the directive', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    defineGeometry(element)
    const directive = createPerfectScrollbarDirective() as ObjectDirective<
      HTMLElement,
      PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined
    >

    directive.mounted?.(element, {
      value: {
        theme: 'dark',
      },
      oldValue: undefined,
    } as never, undefined as never, undefined as never)

    expect(element.classList.contains('nps')).toBe(true)
    expect(element.classList.contains('nps-theme-dark')).toBe(true)

    directive.beforeUnmount?.(element, {
      value: undefined,
      oldValue: undefined,
    } as never, undefined as never, undefined as never)

    expect(element.classList.contains('nps')).toBe(false)
    expect(element.classList.contains('nps-theme-dark')).toBe(false)
  })

  it('accepts a plain options object as the directive binding', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    defineGeometry(element)
    const directive = createPerfectScrollbarDirective() as ObjectDirective<
      HTMLElement,
      PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined
    >

    directive.mounted?.(element, {
      value: {
        suppressScrollY: true,
      },
      oldValue: undefined,
    } as never, undefined as never, undefined as never)

    expect(element.classList.contains('nps')).toBe(true)
    expect(element.classList.contains('nps--active-y')).toBe(false)
  })

  it('updates directive state when the same binding object is mutated', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    defineGeometry(element)
    const directive = createPerfectScrollbarDirective() as ObjectDirective<
      HTMLElement,
      PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined
    >
    const bindingValue: PerfectScrollbarDirectiveBinding = {
      theme: 'dark',
      onReady: vi.fn(),
    }

    directive.mounted?.(element, {
      value: bindingValue,
      oldValue: undefined,
    } as never, undefined as never, undefined as never)

    bindingValue.theme = 'light'
    directive.updated?.(element, {
      value: bindingValue,
      oldValue: bindingValue,
    } as never, undefined as never, undefined as never)

    expect(element.classList.contains('nps-theme-dark')).toBe(false)
    expect(element.classList.contains('nps-theme-light')).toBe(true)
    expect(bindingValue.onReady).toHaveBeenCalledTimes(2)

    bindingValue.disabled = true
    directive.updated?.(element, {
      value: bindingValue,
      oldValue: bindingValue,
    } as never, undefined as never, undefined as never)

    expect(element.classList.contains('nps')).toBe(false)
    expect(element.classList.contains('nps-theme-light')).toBe(false)
  })

  it('keeps the directive SSR-safe', () => {
    const directive = createPerfectScrollbarDirective() as ObjectDirective<
      HTMLElement,
      PerfectScrollbarDirectiveBinding | PerfectScrollbarOptions | undefined
    >

    expect(directive.getSSRProps?.({ value: undefined } as never, undefined as never)).toEqual({})
  })

  it('initializes through the composable when enabled', async () => {
    const TestComponent = defineComponent({
      setup() {
        const disabled = ref(true)
        const api = usePerfectScrollbar(undefined, { disabled })

        return {
          disabled,
          ...api,
        }
      },
      template: '<div ref="element"><div>content</div></div>',
    })

    const wrapper = mount(TestComponent, {
      attachTo: document.body,
    })
    defineGeometry(wrapper.element as HTMLElement)

    ;(wrapper.vm as unknown as { disabled: boolean }).disabled = false
    await nextTick()
    await nextTick()

    expect(wrapper.element.classList.contains('nps')).toBe(true)
    expect((wrapper.vm as unknown as { isReady: boolean }).isReady).toBe(true)

    wrapper.unmount()
    expect(wrapper.element.classList.contains('nps')).toBe(false)
  })
})

function defineGeometry(
  element: HTMLElement,
  geometry: {
    width: number
    height: number
    scrollWidth: number
    scrollHeight: number
  } = {
    width: 200,
    height: 100,
    scrollWidth: 200,
    scrollHeight: 400,
  },
) {
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
