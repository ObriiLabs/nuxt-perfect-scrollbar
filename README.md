# Nuxt Perfect Scrollbar

[English](./README.md) | [Українська](./README.uk.md)

Maintained Nuxt module for custom scrollbars based on a port of
[`perfect-scrollbar`](https://github.com/mdbootstrap/perfect-scrollbar).

The original `perfect-scrollbar` package is no longer pulled in at runtime.
The behavior needed for Nuxt/Vue applications is owned in this repository,
typed, SSR-safe, tested, and adapted to Nuxt module conventions.

## Why This Module

- No dependency on the abandoned `perfect-scrollbar` npm package.
- Nuxt module setup with auto-registered component, directive, and composable.
- `<PerfectScrollbar>` component for normal Vue usage.
- `v-perfect-scrollbar` directive for existing DOM structures.
- `usePerfectScrollbar` composable for advanced control.
- Multiple independent instances on one page.
- Nested scroll containers with local wheel handling.
- CSS variables for theme-level customization.
- Low-cost auto updates with `ResizeObserver`; mutation watching is opt-in.

## Upstream License

This module ports behavior from `perfect-scrollbar@1.5.6`.

`perfect-scrollbar` is published under the MIT License. MIT is a permissive
license that allows copying, modifying, publishing, distributing,
sublicensing, and selling modified versions as long as the copyright and
license notice are preserved.

The upstream notice is kept in [NOTICE.md](./NOTICE.md). This package is also
licensed as MIT.

## Installation

Install the module:

```bash
pnpm add @obriilabs/nuxt-perfect-scrollbar
```

```bash
npm install @obriilabs/nuxt-perfect-scrollbar
```

```bash
yarn add @obriilabs/nuxt-perfect-scrollbar
```

```bash
bun add @obriilabs/nuxt-perfect-scrollbar
```

## Nuxt Setup

Add the module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@obriilabs/nuxt-perfect-scrollbar'],
})
```

With defaults:

```ts
export default defineNuxtConfig({
  modules: ['@obriilabs/nuxt-perfect-scrollbar'],
  perfectScrollbar: {
    enabled: true,
    styles: true,
    componentName: 'PerfectScrollbar',
    directiveName: 'perfect-scrollbar',
    defaultOptions: {
      wheelPropagation: true,
      wheelSpeed: 1,
    },
    defaultAutoUpdate: {
      resize: true,
      mutation: false,
    },
  },
})
```

## Basic Usage

Use the auto-registered component:

```vue
<template>
  <PerfectScrollbar class="panel">
    <div class="panel-content">
      Long content...
    </div>
  </PerfectScrollbar>
</template>

<style scoped>
.panel {
  height: 320px;
}

.panel-content {
  min-height: 900px;
}
</style>
```

The scroll container must have a constrained size, usually `height`,
`max-height`, `width`, or both. The module keeps native `scrollTop` and
`scrollLeft` behavior and draws custom rails/thumbs on top.

## Component API

```vue
<template>
  <PerfectScrollbar
    tag="section"
    theme="admin"
    :options="{
      wheelSpeed: 1,
      wheelPropagation: false,
      minScrollbarLength: 36,
      suppressScrollX: true,
    }"
    :auto-update="{ resize: true, mutation: false }"
    @ready="onReady"
    @scroll="onScroll"
    @reach="onReach"
    @update="onUpdate"
    @destroy="onDestroy"
  >
    <slot />
  </PerfectScrollbar>
</template>

<script setup lang="ts">
import type {
  PerfectScrollbarInstance,
  PerfectScrollbarReachEventDetail,
  PerfectScrollbarScrollEventDetail,
} from '@obriilabs/nuxt-perfect-scrollbar'

function onReady(instance: PerfectScrollbarInstance) {
  instance.update()
}

function onScroll(detail: PerfectScrollbarScrollEventDetail) {
  console.log(detail.axis, detail.direction, detail.scrollTop)
}

function onReach(detail: PerfectScrollbarReachEventDetail) {
  console.log(detail.axis, detail.position)
}

function onUpdate(instance: PerfectScrollbarInstance) {
  console.log(instance.scrollbarYActive)
}

function onDestroy() {
  console.log('destroyed')
}
</script>
```

### Component Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tag` | `string` | `'div'` | HTML tag or component used as the scroll container. |
| `options` | `PerfectScrollbarOptions` | `{}` | Runtime scrollbar behavior. |
| `autoUpdate` | `boolean \| PerfectScrollbarAutoUpdateOptions` | module default | Observer behavior for automatic geometry updates. |
| `disabled` | `boolean` | `false` | Destroys the instance when true and recreates it when false. |
| `theme` | `string \| null` | `null` | Adds `nps-theme-${theme}` to the container. |

### Component Events

| Event | Payload | Description |
| --- | --- | --- |
| `ready` | `PerfectScrollbarInstance` | Fired after the instance is created. |
| `update` | `PerfectScrollbarInstance` | Fired after `instance.update()`. |
| `destroy` | none | Fired before the instance is removed. |
| `scroll` | `PerfectScrollbarScrollEventDetail` | Fired when the container scrolls. |
| `reach` | `PerfectScrollbarReachEventDetail` | Fired when an axis reaches start or end. |

## Directive API

Use the directive when you already own the element markup:

```vue
<template>
  <aside
    v-perfect-scrollbar="{
      theme: 'admin',
      options: { suppressScrollX: true },
      autoUpdate: { resize: true, mutation: true },
      onReady,
    }"
    class="sidebar"
  >
    ...
  </aside>
</template>

<script setup lang="ts">
import type { PerfectScrollbarInstance } from '@obriilabs/nuxt-perfect-scrollbar'

function onReady(instance: PerfectScrollbarInstance) {
  instance.update()
}
</script>
```

For compatibility with the original style, a plain options object is accepted:

```vue
<template>
  <div v-perfect-scrollbar="{ wheelPropagation: false, suppressScrollX: true }">
    ...
  </div>
</template>
```

Directive binding shape:

```ts
interface PerfectScrollbarDirectiveBinding {
  options?: PerfectScrollbarOptions
  autoUpdate?: boolean | PerfectScrollbarAutoUpdateOptions
  disabled?: boolean
  theme?: string | null
  onReady?: (instance: PerfectScrollbarInstance) => void
}
```

## Composable API

Use the composable for custom wrappers, delayed mounting, or direct instance
control:

```vue
<template>
  <div ref="scrollEl" class="scroll-box">
    <slot />
  </div>
</template>

<script setup lang="ts">
const scrollEl = ref<HTMLElement | null>(null)
const disabled = ref(false)

const {
  instance,
  isReady,
  reach,
  update,
  scheduleUpdate,
  destroy,
} = usePerfectScrollbar(scrollEl, {
  disabled,
  options: {
    wheelPropagation: false,
    minScrollbarLength: 32,
  },
  autoUpdate: {
    resize: true,
    mutation: false,
  },
})
</script>
```

Returned values:

| Name | Description |
| --- | --- |
| `element` | Normalized element ref used by the instance. |
| `instance` | Current `PerfectScrollbarInstance` or `null`. |
| `isReady` | Computed boolean for an alive instance. |
| `reach` | Computed `{ x, y }` reach state. |
| `update()` | Updates geometry immediately. |
| `scheduleUpdate()` | Updates through the auto-update scheduler when available. |
| `destroy()` | Destroys observers and the scrollbar instance. |

## Scrollbar Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `handlers` | `PerfectScrollbarHandlerName[]` | all handlers | Enabled handlers: `clickRail`, `dragThumb`, `keyboard`, `wheel`, `touch`. |
| `maxScrollbarLength` | `number \| null` | `null` | Maximum thumb length. |
| `minScrollbarLength` | `number \| null` | `null` | Minimum thumb length. |
| `scrollingThreshold` | `number` | `1000` | Time in ms before scrolling classes are removed. |
| `scrollXMarginOffset` | `number` | `0` | Extra horizontal margin before X axis activates. |
| `scrollYMarginOffset` | `number` | `0` | Extra vertical margin before Y axis activates. |
| `suppressScrollX` | `boolean` | `false` | Disables horizontal custom scrollbar behavior. |
| `suppressScrollY` | `boolean` | `false` | Disables vertical custom scrollbar behavior. |
| `swipeEasing` | `boolean` | `true` | Enables touch inertia after swipe. |
| `useBothWheelAxes` | `boolean` | `false` | Maps wheel input to the active axis when only one axis scrolls. |
| `wheelPropagation` | `boolean` | `true` | Allows wheel events to bubble at scroll edges. |
| `wheelSpeed` | `number` | `1` | Multiplier for wheel delta. |

## Auto Update

By default the module uses `ResizeObserver` and does not watch every DOM
mutation:

```ts
perfectScrollbar: {
  defaultAutoUpdate: {
    resize: true,
    mutation: false,
  },
}
```

Use mutation watching only when content changes without changing the container
size, for example async lists that append items inside a fixed box:

```vue
<template>
  <PerfectScrollbar :auto-update="{ resize: true, mutation: true }">
    <AsyncList />
  </PerfectScrollbar>
</template>
```

You can also call `update()` or `scheduleUpdate()` manually from the composable
or from the `ready` instance.

## Styling

Default styles are injected when `perfectScrollbar.styles` is `true`.

Main classes:

| Class | Description |
| --- | --- |
| `.nps` | Scroll container. |
| `.nps__rail`, `.nps__rail-x`, `.nps__rail-y` | Rail elements. |
| `.nps__thumb`, `.nps__thumb-x`, `.nps__thumb-y` | Thumb elements. |
| `.nps--active-x`, `.nps--active-y` | Axis has scrollable overflow. |
| `.nps--scrolling-x`, `.nps--scrolling-y` | Axis is currently scrolling. |
| `.nps--dragging`, `.nps--dragging-x`, `.nps--dragging-y` | Thumb is being dragged. |
| `.nps--focus` | A thumb is focused. |
| `.nps--rtl` | Container direction is RTL. |

CSS variables:

| Variable | Default |
| --- | --- |
| `--nps-rail-size` | `15px` |
| `--nps-rail-offset` | `0px` |
| `--nps-rail-color` | `transparent` |
| `--nps-rail-hover-color` | `rgb(0 0 0 / 8%)` |
| `--nps-rail-opacity` | `0` |
| `--nps-rail-visible-opacity` | `0.6` |
| `--nps-rail-active-opacity` | `0.9` |
| `--nps-thumb-size` | `6px` |
| `--nps-thumb-hover-size` | `11px` |
| `--nps-thumb-offset` | `2px` |
| `--nps-thumb-color` | `rgba(0, 0, 0, .35)` |
| `--nps-thumb-hover-color` | `rgba(0, 0, 0, .45)` |
| `--nps-thumb-radius` | `999px` |
| `--nps-transition-duration` | `160ms` |

Theme example:

```css
.nps-theme-admin {
  --nps-rail-size: 12px;
  --nps-rail-hover-color: rgb(14 165 233 / 12%);
  --nps-thumb-color: rgb(14 165 233 / 70%);
  --nps-thumb-hover-color: rgb(2 132 199 / 90%);
  --nps-thumb-radius: 4px;
}
```

Disable built-in styles if you want to provide all CSS yourself:

```ts
export default defineNuxtConfig({
  modules: ['@obriilabs/nuxt-perfect-scrollbar'],
  perfectScrollbar: {
    styles: false,
  },
})
```

## Multiple And Nested Scrollbars

Separate scroll containers are independent. Hovering one container only makes
that container's rails visible, and wheel events are handled by the container
under the pointer.

Nested scroll containers also work. Wheel behavior is local:

- If the inner container can still scroll, it consumes the wheel movement.
- If the inner container is at an edge and `wheelPropagation` is `true`, the
  event can bubble to the parent.
- If `wheelPropagation` is `false`, the inner container blocks bubbling at its
  edge.

Visual note: browser `:hover` applies to ancestors too. When the pointer is
over a nested scrollbar, both the inner and outer containers may show their
rails. This mirrors normal CSS hover behavior.

## SSR And Nuxt Behavior

The module is SSR-safe:

- The plugin can be registered during SSR.
- DOM-dependent work is created on client mount.
- The directive exposes SSR props and does not touch DOM during server render.
- `usePerfectScrollbar` initializes after mount and cleans up before unmount.

## Migration Notes

This is not a drop-in package import replacement for every historical
`perfect-scrollbar` wrapper. The goal is a Nuxt-native public API with familiar
behavior:

- Use `<PerfectScrollbar>` instead of manually instantiating a class in Vue
  components.
- Use `v-perfect-scrollbar` for existing DOM.
- Use `usePerfectScrollbar` when you need direct lifecycle control.
- Listen to `scroll` and `reach` component events, or native `nps:*` events on
  the element.
- Customize via `nps-*` classes and CSS variables instead of importing the old
  package CSS.

## TypeScript

Public types are exported from the module:

```ts
import type {
  PerfectScrollbarAutoUpdate,
  PerfectScrollbarAutoUpdateOptions,
  PerfectScrollbarDirectiveBinding,
  PerfectScrollbarHandlerName,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
  PerfectScrollbarReachEventDetail,
  PerfectScrollbarScrollEventDetail,
} from '@obriilabs/nuxt-perfect-scrollbar'
```

## Development

Install dependencies:

```bash
pnpm install
```

Prepare Nuxt stubs and playground:

```bash
pnpm run dev:prepare
```

Run the playground:

```bash
pnpm run dev
```

Useful checks:

```bash
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run test:types
pnpm run prepack
```

Browser tests use Playwright. Install Chromium before the first run if needed:

```bash
pnpm exec playwright install chromium
```

## Porting Rule

Do not add `perfect-scrollbar` as a runtime dependency. When behavior from the
old project is needed, port the relevant implementation into this repository,
adapt it to modern Nuxt/Vue expectations, preserve upstream license notices,
and cover the behavior with focused tests.
