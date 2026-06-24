export type PerfectScrollbarAxis = 'x' | 'y'

export type PerfectScrollbarReachPosition = 'start' | 'end'

export type PerfectScrollbarReach = Record<PerfectScrollbarAxis, PerfectScrollbarReachPosition | null>

export type PerfectScrollbarHandlerName
  = | 'clickRail'
    | 'dragThumb'
    | 'keyboard'
    | 'wheel'
    | 'touch'

export interface PerfectScrollbarOptions {
  handlers?: PerfectScrollbarHandlerName[]
  maxScrollbarLength?: number | null
  minScrollbarLength?: number | null
  scrollingThreshold?: number
  scrollXMarginOffset?: number
  scrollYMarginOffset?: number
  suppressScrollX?: boolean
  suppressScrollY?: boolean
  swipeEasing?: boolean
  useBothWheelAxes?: boolean
  wheelPropagation?: boolean
  wheelSpeed?: number
}

export interface ResolvedPerfectScrollbarOptions {
  handlers: PerfectScrollbarHandlerName[]
  maxScrollbarLength: number | null
  minScrollbarLength: number | null
  scrollingThreshold: number
  scrollXMarginOffset: number
  scrollYMarginOffset: number
  suppressScrollX: boolean
  suppressScrollY: boolean
  swipeEasing: boolean
  useBothWheelAxes: boolean
  wheelPropagation: boolean
  wheelSpeed: number
}

export interface PerfectScrollbarAutoUpdateOptions {
  resize?: boolean
  mutation?: boolean
}

export type PerfectScrollbarAutoUpdate = boolean | PerfectScrollbarAutoUpdateOptions

export interface PerfectScrollbarScrollEventDetail {
  axis: PerfectScrollbarAxis
  direction: 'up' | 'down' | 'left' | 'right'
  reach: PerfectScrollbarReachPosition | null
  scrollTop: number
  scrollLeft: number
}

export interface PerfectScrollbarReachEventDetail {
  axis: PerfectScrollbarAxis
  position: PerfectScrollbarReachPosition
  scrollTop: number
  scrollLeft: number
}

export interface PerfectScrollbarInstance {
  readonly element: HTMLElement
  readonly reach: PerfectScrollbarReach
  readonly isAlive: boolean
  readonly scrollbarXActive: boolean
  readonly scrollbarYActive: boolean
  update: () => void
  destroy: () => void
}

export interface PerfectScrollbarDirectiveBinding {
  options?: PerfectScrollbarOptions
  autoUpdate?: PerfectScrollbarAutoUpdate
  disabled?: boolean
  theme?: string | null
  onReady?: (instance: PerfectScrollbarInstance) => void
}

export interface PerfectScrollbarRuntimeConfig {
  defaultOptions: PerfectScrollbarOptions
  defaultAutoUpdate: PerfectScrollbarAutoUpdateOptions
  directiveName: string
}
