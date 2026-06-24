import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  perfectScrollbar: {
    componentName: 'NPerfectScrollbar',
    directiveName: 'n-perfect-scrollbar',
    styles: false,
  },
})
