import NuxtPerfectScrollbar from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtPerfectScrollbar,
  ],
  perfectScrollbar: {
    defaultOptions: {
      minScrollbarLength: 36,
      wheelPropagation: false,
    },
  },
})
