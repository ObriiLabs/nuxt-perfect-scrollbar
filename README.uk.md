# Nuxt Perfect Scrollbar

[English](./README.md) | [Українська](./README.uk.md)

Підтримуваний Nuxt-модуль для кастомних скролбарів на основі порту поведінки
[`perfect-scrollbar`](https://github.com/mdbootstrap/perfect-scrollbar).

Оригінальний пакет `perfect-scrollbar` більше не підтягується під час runtime.
Поведінка, потрібна для Nuxt/Vue-застосунків, належить цьому репозиторію,
типізована, SSR-safe, покрита тестами й адаптована до конвенцій Nuxt-модулів.

## Чому цей модуль

- Немає залежності від закинутого npm-пакета `perfect-scrollbar`.
- Налаштування через Nuxt-модуль з автоматично зареєстрованими компонентом,
  директивою та composable.
- Компонент `<PerfectScrollbar>` для звичайного Vue-використання.
- Директива `v-perfect-scrollbar` для наявних DOM-структур.
- Composable `usePerfectScrollbar` для розширеного контролю.
- Кілька незалежних інстансів на одній сторінці.
- Вкладені scroll-контейнери з локальною обробкою wheel-подій.
- CSS-змінні для кастомізації на рівні теми.
- Недорогі автоматичні оновлення через `ResizeObserver`; спостереження за
  мутаціями вмикається явно.

## Ліцензія першоджерела

Цей модуль портує поведінку з `perfect-scrollbar@1.5.6`.

`perfect-scrollbar` опублікований під ліцензією MIT. MIT - це дозвільна
ліцензія, яка дозволяє копіювати, змінювати, публікувати, розповсюджувати,
субліцензувати й продавати змінені версії, якщо збережені повідомлення про
copyright і ліцензію.

Повідомлення першоджерела збережене в [NOTICE.md](./NOTICE.md). Цей пакет також
ліцензований як MIT.

## Встановлення

Встановіть модуль:

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

## Налаштування Nuxt

Додайте модуль у `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@obriilabs/nuxt-perfect-scrollbar'],
})
```

Зі значеннями за замовчуванням:

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

## Базове використання

Використовуйте автоматично зареєстрований компонент:

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

Scroll-контейнер має мати обмежений розмір, зазвичай `height`, `max-height`,
`width` або обидві осі. Модуль зберігає нативну поведінку `scrollTop` і
`scrollLeft` та малює кастомні rails/thumbs поверх неї.

## API компонента

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

### Props компонента

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tag` | `string` | `'div'` | HTML-тег або компонент, який використовується як scroll-контейнер. |
| `options` | `PerfectScrollbarOptions` | `{}` | Runtime-поведінка скролбара. |
| `autoUpdate` | `boolean \| PerfectScrollbarAutoUpdateOptions` | module default | Поведінка observer-ів для автоматичних оновлень геометрії. |
| `disabled` | `boolean` | `false` | Знищує інстанс, коли `true`, і створює повторно, коли `false`. |
| `theme` | `string \| null` | `null` | Додає `nps-theme-${theme}` до контейнера. |

### Події компонента

| Event | Payload | Description |
| --- | --- | --- |
| `ready` | `PerfectScrollbarInstance` | Спрацьовує після створення інстанса. |
| `update` | `PerfectScrollbarInstance` | Спрацьовує після `instance.update()`. |
| `destroy` | none | Спрацьовує перед видаленням інстанса. |
| `scroll` | `PerfectScrollbarScrollEventDetail` | Спрацьовує, коли контейнер скролиться. |
| `reach` | `PerfectScrollbarReachEventDetail` | Спрацьовує, коли вісь досягає початку або кінця. |

## API директиви

Використовуйте директиву, коли ви вже володієте розміткою елемента:

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

Для сумісності з оригінальним стилем також приймається звичайний об'єкт
options:

```vue
<template>
  <div v-perfect-scrollbar="{ wheelPropagation: false, suppressScrollX: true }">
    ...
  </div>
</template>
```

Форма binding-а директиви:

```ts
interface PerfectScrollbarDirectiveBinding {
  options?: PerfectScrollbarOptions
  autoUpdate?: boolean | PerfectScrollbarAutoUpdateOptions
  disabled?: boolean
  theme?: string | null
  onReady?: (instance: PerfectScrollbarInstance) => void
}
```

## API composable

Використовуйте composable для кастомних wrapper-ів, відкладеного mount-а або
прямого контролю інстанса:

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

Повернені значення:

| Name | Description |
| --- | --- |
| `element` | Нормалізований element ref, який використовує інстанс. |
| `instance` | Поточний `PerfectScrollbarInstance` або `null`. |
| `isReady` | Computed boolean для живого інстанса. |
| `reach` | Computed `{ x, y }` стану reach. |
| `update()` | Негайно оновлює геометрію. |
| `scheduleUpdate()` | Оновлює через auto-update scheduler, якщо він доступний. |
| `destroy()` | Знищує observer-и та інстанс скролбара. |

## Опції скролбара

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `handlers` | `PerfectScrollbarHandlerName[]` | all handlers | Увімкнені handler-и: `clickRail`, `dragThumb`, `keyboard`, `wheel`, `touch`. |
| `maxScrollbarLength` | `number \| null` | `null` | Максимальна довжина thumb. |
| `minScrollbarLength` | `number \| null` | `null` | Мінімальна довжина thumb. |
| `scrollingThreshold` | `number` | `1000` | Час у мс до зняття scrolling-класів. |
| `scrollXMarginOffset` | `number` | `0` | Додатковий горизонтальний відступ перед активацією осі X. |
| `scrollYMarginOffset` | `number` | `0` | Додатковий вертикальний відступ перед активацією осі Y. |
| `suppressScrollX` | `boolean` | `false` | Вимикає кастомну поведінку горизонтального скролбара. |
| `suppressScrollY` | `boolean` | `false` | Вимикає кастомну поведінку вертикального скролбара. |
| `swipeEasing` | `boolean` | `true` | Вмикає touch-інерцію після swipe. |
| `useBothWheelAxes` | `boolean` | `false` | Перенаправляє wheel input на активну вісь, коли скролиться лише одна вісь. |
| `wheelPropagation` | `boolean` | `true` | Дозволяє wheel-подіям bubbling на краях scroll-області. |
| `wheelSpeed` | `number` | `1` | Множник для wheel delta. |

## Автоматичне оновлення

За замовчуванням модуль використовує `ResizeObserver` і не відстежує кожну DOM
mutation:

```ts
perfectScrollbar: {
  defaultAutoUpdate: {
    resize: true,
    mutation: false,
  },
}
```

Вмикайте mutation watching лише тоді, коли контент змінюється без зміни розміру
контейнера, наприклад async-списки, які додають елементи всередині fixed box:

```vue
<template>
  <PerfectScrollbar :auto-update="{ resize: true, mutation: true }">
    <AsyncList />
  </PerfectScrollbar>
</template>
```

Також можна вручну викликати `update()` або `scheduleUpdate()` з composable чи з
інстанса, отриманого через `ready`.

## Стилізація

Стилі за замовчуванням інжектяться, коли `perfectScrollbar.styles` дорівнює
`true`.

Основні класи:

| Class | Description |
| --- | --- |
| `.nps` | Scroll-контейнер. |
| `.nps__rail`, `.nps__rail-x`, `.nps__rail-y` | Rail-елементи. |
| `.nps__thumb`, `.nps__thumb-x`, `.nps__thumb-y` | Thumb-елементи. |
| `.nps--active-x`, `.nps--active-y` | Вісь має scrollable overflow. |
| `.nps--scrolling-x`, `.nps--scrolling-y` | Вісь зараз скролиться. |
| `.nps--dragging`, `.nps--dragging-x`, `.nps--dragging-y` | Thumb перетягується. |
| `.nps--focus` | Thumb у фокусі. |
| `.nps--rtl` | Контейнер має RTL-напрямок. |

CSS-змінні:

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

Приклад теми:

```css
.nps-theme-admin {
  --nps-rail-size: 12px;
  --nps-rail-hover-color: rgb(14 165 233 / 12%);
  --nps-thumb-color: rgb(14 165 233 / 70%);
  --nps-thumb-hover-color: rgb(2 132 199 / 90%);
  --nps-thumb-radius: 4px;
}
```

Вимкніть вбудовані стилі, якщо хочете надати весь CSS самостійно:

```ts
export default defineNuxtConfig({
  modules: ['@obriilabs/nuxt-perfect-scrollbar'],
  perfectScrollbar: {
    styles: false,
  },
})
```

## Кілька та вкладені скролбари

Окремі scroll-контейнери незалежні. Hover одного контейнера показує rails лише
для цього контейнера, а wheel-події обробляються контейнером під курсором.

Вкладені scroll-контейнери також працюють. Wheel-поведінка локальна:

- Якщо внутрішній контейнер ще може скролитися, він споживає wheel-рух.
- Якщо внутрішній контейнер на краю і `wheelPropagation` дорівнює `true`, подія
  може bubble до батьківського контейнера.
- Якщо `wheelPropagation` дорівнює `false`, внутрішній контейнер блокує bubbling
  на своєму краю.

Візуальна примітка: браузерний `:hover` застосовується і до ancestors. Коли
курсор над вкладеним скролбаром, і внутрішній, і зовнішній контейнери можуть
показувати свої rails. Це повторює звичайну CSS hover-поведінку.

## SSR і поведінка Nuxt

Модуль SSR-safe:

- Plugin може бути зареєстрований під час SSR.
- DOM-залежна робота створюється під час client mount.
- Директива експортує SSR props і не торкається DOM під час server render.
- `usePerfectScrollbar` ініціалізується після mount і очищається перед unmount.

## Нотатки з міграції

Це не drop-in заміна package import для кожного історичного wrapper-а
`perfect-scrollbar`. Мета - Nuxt-native публічний API зі знайомою поведінкою:

- Використовуйте `<PerfectScrollbar>` замість ручного створення class-інстанса
  у Vue-компонентах.
- Використовуйте `v-perfect-scrollbar` для наявного DOM.
- Використовуйте `usePerfectScrollbar`, коли потрібен прямий lifecycle-control.
- Слухайте компонентні події `scroll` і `reach` або нативні `nps:*` події на
  елементі.
- Кастомізуйте через `nps-*` класи та CSS-змінні замість імпорту старого package
  CSS.

## TypeScript

Публічні типи експортуються з модуля:

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

## Розробка

Встановіть залежності:

```bash
pnpm install
```

Підготуйте Nuxt stubs і playground:

```bash
pnpm run dev:prepare
```

Запустіть playground:

```bash
pnpm run dev
```

Корисні перевірки:

```bash
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run test:types
pnpm run prepack
```

Browser-тести використовують Playwright. Перед першим запуском за потреби
встановіть Chromium:

```bash
pnpm exec playwright install chromium
```

## Правило портування

Не додавайте `perfect-scrollbar` як runtime-залежність. Коли потрібна поведінка
зі старого проєкту, портуйте відповідну реалізацію в цей репозиторій,
адаптуйте її до сучасних очікувань Nuxt/Vue, зберігайте upstream license
notices і покривайте поведінку сфокусованими тестами.
