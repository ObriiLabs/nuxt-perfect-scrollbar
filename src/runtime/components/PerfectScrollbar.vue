<template>
  <component
    :is="tag"
    ref="root"
    :class="themeClass"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onUpdated, watch } from 'vue'
import { usePerfectScrollbar } from '../composables/usePerfectScrollbar'
import type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
  PerfectScrollbarReachEventDetail,
  PerfectScrollbarScrollEventDetail,
} from '../types'

interface Props {
  tag?: string
  options?: PerfectScrollbarOptions
  disabled?: boolean
  autoUpdate?: PerfectScrollbarAutoUpdate
  theme?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  disabled: false,
  theme: null,
})

const emit = defineEmits<{
  ready: [instance: PerfectScrollbarInstance]
  update: [instance: PerfectScrollbarInstance]
  destroy: []
  scroll: [detail: PerfectScrollbarScrollEventDetail]
  reach: [detail: PerfectScrollbarReachEventDetail]
}>()

const {
  element: root,
  instance,
  scheduleUpdate,
} = usePerfectScrollbar(undefined, {
  options: computed(() => props.options),
  autoUpdate: computed(() => props.autoUpdate),
  disabled: computed(() => props.disabled),
})
const themeClass = computed(() => props.theme ? `nps-theme-${props.theme}` : undefined)
let cleanupListeners: (() => void) | null = null

watch(instance, (nextInstance) => {
  cleanupListeners?.()
  cleanupListeners = null

  if (!nextInstance) {
    return
  }

  cleanupListeners = bindInstanceEvents(nextInstance)
  emit('ready', nextInstance)
})

onUpdated(() => {
  scheduleUpdate()
})

onBeforeUnmount(() => {
  cleanupListeners?.()
  cleanupListeners = null
})

function bindInstanceEvents(nextInstance: PerfectScrollbarInstance) {
  const element = nextInstance.element
  const onScroll = (event: Event) => {
    emit('scroll', (event as CustomEvent<PerfectScrollbarScrollEventDetail>).detail)
  }
  const onReach = (event: Event) => {
    emit('reach', (event as CustomEvent<PerfectScrollbarReachEventDetail>).detail)
  }
  const onUpdate = () => {
    emit('update', nextInstance)
  }
  const onDestroy = () => {
    emit('destroy')
  }

  element.addEventListener('nps:scroll', onScroll)
  element.addEventListener('nps:reach', onReach)
  element.addEventListener('nps:update', onUpdate)
  element.addEventListener('nps:destroy', onDestroy)

  return () => {
    element.removeEventListener('nps:scroll', onScroll)
    element.removeEventListener('nps:reach', onReach)
    element.removeEventListener('nps:update', onUpdate)
    element.removeEventListener('nps:destroy', onDestroy)
  }
}
</script>
