# Nuxt Perfect Scrollbar

Nuxt module for maintaining a native Nuxt integration of the abandoned
`perfect-scrollbar` behavior.

This package is intentionally not a wrapper around the original
`perfect-scrollbar` npm package. Runtime code and styles should be ported into
this repository so the Nuxt module can be maintained independently.

## Features

- Nuxt module starter based on the official module template.
- Client-only runtime plugin registration.
- Typed module options under `perfectScrollbar`.
- Playground application for local development.
- Vitest and Nuxt test-utils harness from the starter template.

## Quick Setup

Install the module in a Nuxt project:

```bash
pnpm add nuxt-perfect-scrollbar
```

Add it to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-perfect-scrollbar'],
  perfectScrollbar: {
    enabled: true,
  },
})
```

## Development

```bash
pnpm install
pnpm run dev:prepare
pnpm run dev
```

Useful checks:

```bash
pnpm run lint
pnpm run test
pnpm run test:types
pnpm run prepack
```

## Porting Rule

Do not add `perfect-scrollbar` as a runtime dependency. When behavior from the
old project is needed, copy the relevant implementation into this repository,
adapt it to modern Nuxt/Vue expectations, and cover the behavior with focused
tests.
