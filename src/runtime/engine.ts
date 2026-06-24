import type {
  PerfectScrollbarAxis,
  PerfectScrollbarHandlerName,
  PerfectScrollbarInstance,
  PerfectScrollbarOptions,
  PerfectScrollbarReach,
  PerfectScrollbarReachEventDetail,
  PerfectScrollbarScrollEventDetail,
  ResolvedPerfectScrollbarOptions,
} from './types'

// Runtime behavior is adapted from perfect-scrollbar@1.5.6 under the MIT license.
type StyleValue = number | string | null | undefined
type EventTargetWithListener = HTMLElement | Document

const classNames = {
  main: 'nps',
  rtl: 'nps--rtl',
  childConsume: 'nps__child-consume',
  rail: (axis: PerfectScrollbarAxis) => `nps__rail nps__rail-${axis}`,
  thumb: (axis: PerfectScrollbarAxis) => `nps__thumb nps__thumb-${axis}`,
  active: (axis: PerfectScrollbarAxis) => `nps--active-${axis}`,
  scrolling: (axis: PerfectScrollbarAxis) => `nps--scrolling-${axis}`,
  focus: 'nps--focus',
  dragging: (axis: PerfectScrollbarAxis) => `nps--dragging nps--dragging-${axis}`,
}

const defaultHandlers: PerfectScrollbarHandlerName[] = [
  'clickRail',
  'dragThumb',
  'keyboard',
  'wheel',
  'touch',
]

export function getDefaultPerfectScrollbarOptions(): ResolvedPerfectScrollbarOptions {
  return {
    handlers: [...defaultHandlers],
    maxScrollbarLength: null,
    minScrollbarLength: null,
    scrollingThreshold: 1000,
    scrollXMarginOffset: 0,
    scrollYMarginOffset: 0,
    suppressScrollX: false,
    suppressScrollY: false,
    swipeEasing: true,
    useBothWheelAxes: false,
    wheelPropagation: true,
    wheelSpeed: 1,
  }
}

class EventManager {
  private readonly entries: Array<{
    element: EventTargetWithListener
    eventName: string
    handler: EventListener
    options?: AddEventListenerOptions | boolean
  }> = []

  bind(
    element: EventTargetWithListener,
    eventName: string,
    handler: EventListener,
    options?: AddEventListenerOptions | boolean,
  ) {
    element.addEventListener(eventName, handler, options)
    this.entries.push({ element, eventName, handler, options })
  }

  unbind(element: EventTargetWithListener, eventName: string, handler: EventListener) {
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index]
      if (!entry) {
        continue
      }
      if (entry.element === element && entry.eventName === eventName && entry.handler === handler) {
        entry.element.removeEventListener(entry.eventName, entry.handler, entry.options)
        this.entries.splice(index, 1)
      }
    }
  }

  unbindAll() {
    for (const entry of this.entries) {
      entry.element.removeEventListener(entry.eventName, entry.handler, entry.options)
    }
    this.entries.length = 0
  }
}

export class PerfectScrollbarEngine implements PerfectScrollbarInstance {
  readonly element: HTMLElement
  readonly ownerDocument: Document
  readonly ownerWindow: Window
  readonly settings: ResolvedPerfectScrollbarOptions
  readonly reach: PerfectScrollbarReach = { x: null, y: null }

  isAlive = true
  isRtl = false
  isNegativeScroll = false
  negativeScrollAdjustment = 0

  containerWidth = 0
  containerHeight = 0
  contentWidth = 0
  contentHeight = 0

  scrollbarXRail: HTMLElement
  scrollbarX: HTMLElement
  scrollbarXActive = false
  scrollbarXWidth = 0
  scrollbarXLeft = 0
  scrollbarXBottom = 0
  scrollbarXTop = 0
  isScrollbarXUsingBottom = true
  railXWidth = 0
  railXRatio = 1
  railBorderXWidth = 0
  railXMarginWidth = 0

  scrollbarYRail: HTMLElement
  scrollbarY: HTMLElement
  scrollbarYActive = false
  scrollbarYHeight = 0
  scrollbarYTop = 0
  scrollbarYRight = 0
  scrollbarYLeft = 0
  scrollbarYOuterWidth = 0
  isScrollbarYUsingRight = true
  railYHeight = 0
  railYRatio = 1
  railBorderYWidth = 0
  railYMarginHeight = 0

  private readonly event = new EventManager()
  private readonly scrollingClassTimeouts: Record<PerfectScrollbarAxis, number | null> = {
    x: null,
    y: null,
  }

  private lastScrollTop = 0
  private lastScrollLeft = 0
  private touchEasingLoop: number | null = null
  private touchStartOffset: { pageX: number, pageY: number } | null = null
  private touchStartTime = 0
  private touchSpeed = { x: 0, y: 0 }
  private activeDragAxis: PerfectScrollbarAxis | null = null

  constructor(element: HTMLElement, userSettings: PerfectScrollbarOptions = {}) {
    if (!element || !element.nodeName) {
      throw new Error('No element was specified to initialize PerfectScrollbarEngine')
    }

    this.element = element
    this.ownerDocument = element.ownerDocument || document
    this.ownerWindow = this.ownerDocument.defaultView || window
    this.settings = {
      ...getDefaultPerfectScrollbarOptions(),
      ...userSettings,
      handlers: userSettings.handlers ? [...userSettings.handlers] : [...defaultHandlers],
    }

    this.element.classList.add(classNames.main)
    this.isRtl = getStyles(this.element).direction === 'rtl'
    if (this.isRtl) {
      this.element.classList.add(classNames.rtl)
    }

    this.isNegativeScroll = this.detectNegativeScroll()
    this.negativeScrollAdjustment = this.isNegativeScroll
      ? this.element.scrollWidth - this.element.clientWidth
      : 0

    this.scrollbarXRail = createDiv(this.ownerDocument, classNames.rail('x'))
    this.scrollbarX = createDiv(this.ownerDocument, classNames.thumb('x'))
    this.scrollbarXRail.appendChild(this.scrollbarX)
    this.scrollbarX.setAttribute('tabindex', '0')
    this.element.appendChild(this.scrollbarXRail)

    this.scrollbarYRail = createDiv(this.ownerDocument, classNames.rail('y'))
    this.scrollbarY = createDiv(this.ownerDocument, classNames.thumb('y'))
    this.scrollbarYRail.appendChild(this.scrollbarY)
    this.scrollbarY.setAttribute('tabindex', '0')
    this.element.appendChild(this.scrollbarYRail)

    this.measureRailBase()
    this.bindFocusState()
    this.bindHandlers()

    this.lastScrollTop = Math.floor(this.element.scrollTop)
    this.lastScrollLeft = this.element.scrollLeft
    this.event.bind(this.element, 'scroll', () => this.onScroll())

    this.updateGeometry()
  }

  update() {
    if (!this.isAlive) {
      return
    }

    this.negativeScrollAdjustment = this.isNegativeScroll
      ? this.element.scrollWidth - this.element.clientWidth
      : 0

    setStyles(this.scrollbarXRail, { display: 'block' })
    setStyles(this.scrollbarYRail, { display: 'block' })
    this.railXMarginWidth = getHorizontalMarginWidth(this.scrollbarXRail)
    this.railYMarginHeight = getVerticalMarginHeight(this.scrollbarYRail)

    setStyles(this.scrollbarXRail, { display: 'none' })
    setStyles(this.scrollbarYRail, { display: 'none' })

    this.updateGeometry()
    this.processScrollDiff('y', 0, false, true)
    this.processScrollDiff('x', 0, false, true)

    setStyles(this.scrollbarXRail, { display: '' })
    setStyles(this.scrollbarYRail, { display: '' })
    this.dispatch('nps:update', undefined)
  }

  destroy() {
    if (!this.isAlive) {
      return
    }

    this.dispatch('nps:destroy', undefined)
    this.isAlive = false
    this.event.unbindAll()
    this.clearScrollingTimeout('x')
    this.clearScrollingTimeout('y')
    this.stopTouchEasing()
    removeElement(this.scrollbarX)
    removeElement(this.scrollbarY)
    removeElement(this.scrollbarXRail)
    removeElement(this.scrollbarYRail)
    this.removeClasses()
  }

  private bindFocusState() {
    const focus = () => this.element.classList.add(classNames.focus)
    const blur = () => this.element.classList.remove(classNames.focus)

    this.event.bind(this.scrollbarX, 'focus', focus)
    this.event.bind(this.scrollbarX, 'blur', blur)
    this.event.bind(this.scrollbarY, 'focus', focus)
    this.event.bind(this.scrollbarY, 'blur', blur)
  }

  private bindHandlers() {
    for (const handler of this.settings.handlers) {
      switch (handler) {
        case 'clickRail':
          this.bindClickRailHandler()
          break
        case 'dragThumb':
          this.bindDragThumbHandler('x')
          this.bindDragThumbHandler('y')
          break
        case 'keyboard':
          this.bindKeyboardHandler()
          break
        case 'wheel':
          this.bindWheelHandler()
          break
        case 'touch':
          this.bindTouchHandler()
          break
        default:
          throw new Error(`Unsupported perfect scrollbar handler: ${handler}`)
      }
    }
  }

  private detectNegativeScroll() {
    const originalScrollLeft = this.element.scrollLeft
    this.element.scrollLeft = -1
    const result = this.element.scrollLeft < 0
    this.element.scrollLeft = originalScrollLeft
    return result
  }

  private measureRailBase() {
    const xRailStyle = getStyles(this.scrollbarXRail)
    this.scrollbarXBottom = Number.parseInt(xRailStyle.bottom, 10)
    if (Number.isNaN(this.scrollbarXBottom)) {
      this.isScrollbarXUsingBottom = false
      this.scrollbarXTop = toInt(xRailStyle.top)
    }
    this.railBorderXWidth = toInt(xRailStyle.borderLeftWidth) + toInt(xRailStyle.borderRightWidth)
    setStyles(this.scrollbarXRail, { display: 'block' })
    this.railXMarginWidth = getHorizontalMarginWidth(this.scrollbarXRail)
    setStyles(this.scrollbarXRail, { display: '' })

    const yRailStyle = getStyles(this.scrollbarYRail)
    this.scrollbarYRight = Number.parseInt(yRailStyle.right, 10)
    if (Number.isNaN(this.scrollbarYRight)) {
      this.isScrollbarYUsingRight = false
      this.scrollbarYLeft = toInt(yRailStyle.left)
    }
    this.scrollbarYOuterWidth = this.isRtl ? outerWidth(this.scrollbarY) : 0
    this.railBorderYWidth = toInt(yRailStyle.borderTopWidth) + toInt(yRailStyle.borderBottomWidth)
    setStyles(this.scrollbarYRail, { display: 'block' })
    this.railYMarginHeight = getVerticalMarginHeight(this.scrollbarYRail)
    setStyles(this.scrollbarYRail, { display: '' })
  }

  private updateGeometry() {
    const roundedScrollTop = Math.floor(this.element.scrollTop)
    const rect = this.element.getBoundingClientRect()

    this.containerWidth = Math.floor(rect.width || this.element.clientWidth)
    this.containerHeight = Math.floor(rect.height || this.element.clientHeight)
    this.contentWidth = this.element.scrollWidth
    this.contentHeight = this.element.scrollHeight

    this.ensureRailAttached('x')
    this.ensureRailAttached('y')

    if (
      !this.settings.suppressScrollX
      && this.containerWidth + this.settings.scrollXMarginOffset < this.contentWidth
    ) {
      this.scrollbarXActive = true
      this.railXWidth = Math.max(this.containerWidth - this.railXMarginWidth, 0)
      this.railXRatio = this.railXWidth > 0 ? this.containerWidth / this.railXWidth : 1
      this.scrollbarXWidth = this.getThumbSize(
        toInt((this.railXWidth * this.containerWidth) / this.contentWidth),
      )
      const maxScrollLeft = Math.max(this.contentWidth - this.containerWidth, 1)
      this.scrollbarXLeft = toInt(
        ((this.negativeScrollAdjustment + this.element.scrollLeft)
          * (this.railXWidth - this.scrollbarXWidth))
        / maxScrollLeft,
      )
    }
    else {
      this.scrollbarXActive = false
    }

    if (
      !this.settings.suppressScrollY
      && this.containerHeight + this.settings.scrollYMarginOffset < this.contentHeight
    ) {
      this.scrollbarYActive = true
      this.railYHeight = Math.max(this.containerHeight - this.railYMarginHeight, 0)
      this.railYRatio = this.railYHeight > 0 ? this.containerHeight / this.railYHeight : 1
      this.scrollbarYHeight = this.getThumbSize(
        toInt((this.railYHeight * this.containerHeight) / this.contentHeight),
      )
      const maxScrollTop = Math.max(this.contentHeight - this.containerHeight, 1)
      this.scrollbarYTop = toInt(
        (roundedScrollTop * (this.railYHeight - this.scrollbarYHeight)) / maxScrollTop,
      )
    }
    else {
      this.scrollbarYActive = false
    }

    this.scrollbarXLeft = clamp(this.scrollbarXLeft, 0, this.railXWidth - this.scrollbarXWidth)
    this.scrollbarYTop = clamp(this.scrollbarYTop, 0, this.railYHeight - this.scrollbarYHeight)

    this.updateCss()
    this.updateActiveClasses()
  }

  private ensureRailAttached(axis: PerfectScrollbarAxis) {
    const rail = axis === 'x' ? this.scrollbarXRail : this.scrollbarYRail
    if (this.element.contains(rail)) {
      return
    }

    const selector = axis === 'x' ? '.nps__rail-x' : '.nps__rail-y'
    for (const child of Array.from(this.element.children)) {
      if (matches(child, selector)) {
        removeElement(child)
      }
    }
    this.element.appendChild(rail)
  }

  private updateCss() {
    const roundedScrollTop = Math.floor(this.element.scrollTop)
    const xRailOffset: Record<string, StyleValue> = { width: this.railXWidth }

    if (this.isRtl) {
      xRailOffset.left
        = this.negativeScrollAdjustment
          + this.element.scrollLeft
          + this.containerWidth
          - this.contentWidth
    }
    else {
      xRailOffset.left = this.element.scrollLeft
    }

    if (this.isScrollbarXUsingBottom) {
      xRailOffset.bottom = this.scrollbarXBottom - roundedScrollTop
    }
    else {
      xRailOffset.top = this.scrollbarXTop + roundedScrollTop
    }
    setStyles(this.scrollbarXRail, xRailOffset)

    const yRailOffset: Record<string, StyleValue> = {
      top: roundedScrollTop,
      height: this.railYHeight,
    }

    if (this.isScrollbarYUsingRight) {
      if (this.isRtl) {
        yRailOffset.right
          = this.contentWidth
            - (this.negativeScrollAdjustment + this.element.scrollLeft)
            - this.scrollbarYRight
            - this.scrollbarYOuterWidth
            - 9
      }
      else {
        yRailOffset.right = this.scrollbarYRight - this.element.scrollLeft
      }
    }
    else if (this.isRtl) {
      yRailOffset.left
        = this.negativeScrollAdjustment
          + this.element.scrollLeft
          + this.containerWidth * 2
          - this.contentWidth
          - this.scrollbarYLeft
          - this.scrollbarYOuterWidth
    }
    else {
      yRailOffset.left = this.scrollbarYLeft + this.element.scrollLeft
    }
    setStyles(this.scrollbarYRail, yRailOffset)

    setStyles(this.scrollbarX, {
      left: this.scrollbarXLeft,
      width: Math.max(this.scrollbarXWidth - this.railBorderXWidth, 0),
    })
    setStyles(this.scrollbarY, {
      top: this.scrollbarYTop,
      height: Math.max(this.scrollbarYHeight - this.railBorderYWidth, 0),
    })
  }

  private updateActiveClasses() {
    this.element.classList.toggle(classNames.active('x'), this.scrollbarXActive)
    this.element.classList.toggle(classNames.active('y'), this.scrollbarYActive)

    if (!this.scrollbarXActive) {
      this.scrollbarXWidth = 0
      this.scrollbarXLeft = 0
    }
    if (!this.scrollbarYActive) {
      this.scrollbarYHeight = 0
      this.scrollbarYTop = 0
    }
  }

  private getThumbSize(thumbSize: number) {
    let size = thumbSize
    if (this.settings.minScrollbarLength) {
      size = Math.max(size, this.settings.minScrollbarLength)
    }
    if (this.settings.maxScrollbarLength) {
      size = Math.min(size, this.settings.maxScrollbarLength)
    }
    return size
  }

  private onScroll() {
    if (!this.isAlive) {
      return
    }

    this.updateGeometry()
    this.processScrollDiff('y', this.element.scrollTop - this.lastScrollTop)
    this.processScrollDiff('x', this.element.scrollLeft - this.lastScrollLeft)
    this.lastScrollTop = Math.floor(this.element.scrollTop)
    this.lastScrollLeft = this.element.scrollLeft
  }

  private processScrollDiff(
    axis: PerfectScrollbarAxis,
    diff: number,
    useScrollingClass = true,
    forceFireReachEvent = false,
  ) {
    const contentSize = axis === 'y' ? this.contentHeight : this.contentWidth
    const containerSize = axis === 'y' ? this.containerHeight : this.containerWidth
    const scrollOffset = axis === 'y' ? this.element.scrollTop : this.element.scrollLeft

    this.reach[axis] = null
    if (scrollOffset < 1) {
      this.reach[axis] = 'start'
    }
    if (scrollOffset > contentSize - containerSize - 1) {
      this.reach[axis] = 'end'
    }

    if (diff) {
      this.dispatchScroll(axis, diff)
      if (useScrollingClass) {
        this.setScrollingClass(axis)
      }
    }

    const reach = this.reach[axis]
    if (reach && (diff || forceFireReachEvent)) {
      this.dispatchReach(axis, reach)
    }
  }

  private dispatchScroll(axis: PerfectScrollbarAxis, diff: number) {
    const direction = axis === 'y'
      ? diff < 0 ? 'up' : 'down'
      : diff < 0 ? 'left' : 'right'

    this.dispatch<PerfectScrollbarScrollEventDetail>('nps:scroll', {
      axis,
      direction,
      reach: this.reach[axis],
      scrollTop: this.element.scrollTop,
      scrollLeft: this.element.scrollLeft,
    })
  }

  private dispatchReach(axis: PerfectScrollbarAxis, position: 'start' | 'end') {
    this.dispatch<PerfectScrollbarReachEventDetail>('nps:reach', {
      axis,
      position,
      scrollTop: this.element.scrollTop,
      scrollLeft: this.element.scrollLeft,
    })
  }

  private dispatch<T>(name: string, detail: T) {
    const CustomEventConstructor = (this.ownerWindow as Window & {
      CustomEvent: typeof CustomEvent
    }).CustomEvent
    this.element.dispatchEvent(new CustomEventConstructor(name, { detail }))
  }

  private setScrollingClass(axis: PerfectScrollbarAxis) {
    const className = classNames.scrolling(axis)
    this.element.classList.add(className)
    this.clearScrollingTimeout(axis)
    this.scrollingClassTimeouts[axis] = this.ownerWindow.setTimeout(() => {
      if (this.isAlive) {
        this.element.classList.remove(className)
      }
      this.scrollingClassTimeouts[axis] = null
    }, this.settings.scrollingThreshold)
  }

  private clearScrollingTimeout(axis: PerfectScrollbarAxis) {
    const timeout = this.scrollingClassTimeouts[axis]
    if (timeout !== null) {
      this.ownerWindow.clearTimeout(timeout)
      this.scrollingClassTimeouts[axis] = null
    }
  }

  private bindClickRailHandler() {
    this.event.bind(this.scrollbarY, 'mousedown', event => event.stopPropagation())
    this.event.bind(this.scrollbarYRail, 'mousedown', (event) => {
      const mouseEvent = event as MouseEvent
      const positionTop
        = mouseEvent.pageY
          - this.ownerWindow.pageYOffset
          - this.scrollbarYRail.getBoundingClientRect().top
      const direction = positionTop > this.scrollbarYTop ? 1 : -1
      this.element.scrollTop += direction * this.containerHeight
      this.updateGeometry()
      mouseEvent.stopPropagation()
    })

    this.event.bind(this.scrollbarX, 'mousedown', event => event.stopPropagation())
    this.event.bind(this.scrollbarXRail, 'mousedown', (event) => {
      const mouseEvent = event as MouseEvent
      const positionLeft
        = mouseEvent.pageX
          - this.ownerWindow.pageXOffset
          - this.scrollbarXRail.getBoundingClientRect().left
      const direction = positionLeft > this.scrollbarXLeft ? 1 : -1
      this.element.scrollLeft += direction * this.containerWidth
      this.updateGeometry()
      mouseEvent.stopPropagation()
    })
  }

  private bindDragThumbHandler(axis: PerfectScrollbarAxis) {
    const thumb = axis === 'x' ? this.scrollbarX : this.scrollbarY
    const rail = axis === 'x' ? this.scrollbarXRail : this.scrollbarYRail
    const scrollField = axis === 'x' ? 'scrollLeft' : 'scrollTop'
    const pageField = axis === 'x' ? 'pageX' : 'pageY'

    let startingScrollPosition = 0
    let startingMousePagePosition = 0
    let scrollBy = 0

    const moveHandler = (event: Event) => {
      if (this.activeDragAxis !== axis) {
        return
      }

      const pagePosition = getPagePosition(event, pageField)
      this.element[scrollField]
        = startingScrollPosition + scrollBy * (pagePosition - startingMousePagePosition)
      this.element.classList.add(...classNames.dragging(axis).split(' '))
      this.updateGeometry()
      event.stopPropagation()
      if (isCancelable(event)) {
        event.preventDefault()
      }
    }

    const endHandler = () => {
      this.activeDragAxis = null
      this.element.classList.remove(...classNames.dragging(axis).split(' '))
      rail.classList.remove('nps--rail-dragging')
      this.event.unbind(this.ownerDocument, 'mousemove', moveHandler)
      this.event.unbind(this.ownerDocument, 'mouseup', endHandler)
      this.event.unbind(this.ownerDocument, 'touchmove', moveHandler)
      this.event.unbind(this.ownerDocument, 'touchend', endHandler)
    }

    const startHandler = (event: Event) => {
      if (this.activeDragAxis !== null) {
        return
      }

      this.activeDragAxis = axis
      startingScrollPosition = this.element[scrollField]
      startingMousePagePosition = getPagePosition(event, pageField)

      const contentSize = axis === 'x' ? this.contentWidth : this.contentHeight
      const containerSize = axis === 'x' ? this.containerWidth : this.containerHeight
      const railSize = axis === 'x' ? this.railXWidth : this.railYHeight
      const thumbSize = axis === 'x' ? this.scrollbarXWidth : this.scrollbarYHeight
      scrollBy = (contentSize - containerSize) / Math.max(railSize - thumbSize, 1)

      if (isTouchEvent(event)) {
        this.event.bind(this.ownerDocument, 'touchmove', moveHandler, { passive: false })
        this.event.bind(this.ownerDocument, 'touchend', endHandler)
      }
      else {
        this.event.bind(this.ownerDocument, 'mousemove', moveHandler)
        this.event.bind(this.ownerDocument, 'mouseup', endHandler)
      }

      rail.classList.add('nps--rail-dragging')
      event.stopPropagation()
      if (isCancelable(event)) {
        event.preventDefault()
      }
    }

    this.event.bind(thumb, 'mousedown', startHandler)
    this.event.bind(thumb, 'touchstart', startHandler, { passive: false })
  }

  private bindKeyboardHandler() {
    this.event.bind(this.ownerDocument, 'keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.defaultPrevented || (!this.isHovered() && !this.isThumbFocused())) {
        return
      }

      const activeElement = getDeepActiveElement(this.ownerDocument)
      if (activeElement && isEditable(activeElement)) {
        return
      }

      let deltaX = 0
      let deltaY = 0

      switch (keyboardEvent.key) {
        case 'ArrowLeft':
          deltaX = keyboardEvent.metaKey
            ? -this.contentWidth
            : keyboardEvent.altKey ? -this.containerWidth : -30
          break
        case 'ArrowUp':
          deltaY = keyboardEvent.metaKey
            ? -this.contentHeight
            : keyboardEvent.altKey ? -this.containerHeight : -30
          break
        case 'ArrowRight':
          deltaX = keyboardEvent.metaKey
            ? this.contentWidth
            : keyboardEvent.altKey ? this.containerWidth : 30
          break
        case 'ArrowDown':
          deltaY = keyboardEvent.metaKey
            ? this.contentHeight
            : keyboardEvent.altKey ? this.containerHeight : 30
          break
        case ' ':
          deltaY = keyboardEvent.shiftKey ? -this.containerHeight : this.containerHeight
          break
        case 'PageUp':
          deltaY = -this.containerHeight
          break
        case 'PageDown':
          deltaY = this.containerHeight
          break
        case 'Home':
          deltaY = -this.contentHeight
          break
        case 'End':
          deltaY = this.contentHeight
          break
        default:
          return
      }

      if ((this.settings.suppressScrollX && deltaX !== 0) || (this.settings.suppressScrollY && deltaY !== 0)) {
        return
      }

      this.element.scrollTop += deltaY
      this.element.scrollLeft += deltaX
      this.updateGeometry()

      if (this.shouldPreventKeyboardDefault(deltaX, deltaY)) {
        keyboardEvent.preventDefault()
      }
    })
  }

  private bindWheelHandler() {
    const wheelEventName = 'onwheel' in this.ownerWindow ? 'wheel' : 'mousewheel'
    this.event.bind(this.element, wheelEventName, (event) => {
      const wheelEvent = event as WheelEvent
      const [deltaX, deltaY] = this.getWheelDelta(wheelEvent)

      if (this.shouldBeConsumedByChild(wheelEvent.target, deltaX, deltaY)) {
        return
      }

      let shouldPrevent = false
      if (!this.settings.useBothWheelAxes) {
        this.element.scrollTop += deltaY * this.settings.wheelSpeed
        this.element.scrollLeft += deltaX * this.settings.wheelSpeed
      }
      else if (this.scrollbarYActive && !this.scrollbarXActive) {
        this.element.scrollTop += (deltaY || deltaX) * this.settings.wheelSpeed
        shouldPrevent = true
      }
      else if (this.scrollbarXActive && !this.scrollbarYActive) {
        this.element.scrollLeft += (deltaX || deltaY) * this.settings.wheelSpeed
        shouldPrevent = true
      }

      this.updateGeometry()
      shouldPrevent = shouldPrevent || this.shouldPreventWheelDefault(deltaX, deltaY)
      if (shouldPrevent && !wheelEvent.ctrlKey) {
        wheelEvent.stopPropagation()
        wheelEvent.preventDefault()
      }
    }, { passive: false })
  }

  private bindTouchHandler() {
    if (!this.supportsTouch() && !this.supportsPointerTouch()) {
      return
    }

    const start = (event: Event) => {
      if (!this.shouldHandleTouch(event)) {
        return
      }

      const touch = getTouchPoint(event)
      this.touchStartOffset = { pageX: touch.pageX, pageY: touch.pageY }
      this.touchStartTime = Date.now()
      this.stopTouchEasing()
    }

    const move = (event: Event) => {
      if (!this.shouldHandleTouch(event) || !this.touchStartOffset) {
        return
      }

      const touch = getTouchPoint(event)
      const currentOffset = { pageX: touch.pageX, pageY: touch.pageY }
      const differenceX = currentOffset.pageX - this.touchStartOffset.pageX
      const differenceY = currentOffset.pageY - this.touchStartOffset.pageY
      const scrollDeltaX = -differenceX
      const scrollDeltaY = -differenceY

      if (this.shouldBeConsumedByChild(event.target, scrollDeltaX, scrollDeltaY)) {
        return
      }

      this.applyTouchMove(differenceX, differenceY)
      this.touchStartOffset = currentOffset

      const now = Date.now()
      const timeGap = now - this.touchStartTime
      if (timeGap > 0) {
        this.touchSpeed.x = differenceX / timeGap
        this.touchSpeed.y = differenceY / timeGap
        this.touchStartTime = now
      }

      if (this.shouldPreventTouchDefault(scrollDeltaX, scrollDeltaY) && isCancelable(event)) {
        event.preventDefault()
      }
    }

    const end = () => {
      if (!this.settings.swipeEasing) {
        return
      }

      this.stopTouchEasing()
      this.touchEasingLoop = this.ownerWindow.setInterval(() => {
        if (!this.isAlive) {
          this.stopTouchEasing()
          return
        }

        if (!this.touchSpeed.x && !this.touchSpeed.y) {
          this.stopTouchEasing()
          return
        }

        if (Math.abs(this.touchSpeed.x) < 0.01 && Math.abs(this.touchSpeed.y) < 0.01) {
          this.stopTouchEasing()
          return
        }

        this.applyTouchMove(this.touchSpeed.x * 30, this.touchSpeed.y * 30)
        this.touchSpeed.x *= 0.8
        this.touchSpeed.y *= 0.8
      }, 10)
    }

    if (this.supportsTouch()) {
      this.event.bind(this.element, 'touchstart', start, { passive: true })
      this.event.bind(this.element, 'touchmove', move, { passive: false })
      this.event.bind(this.element, 'touchend', end)
    }

    if ('PointerEvent' in this.ownerWindow) {
      this.event.bind(this.element, 'pointerdown', start)
      this.event.bind(this.element, 'pointermove', move)
      this.event.bind(this.element, 'pointerup', end)
    }
  }

  private applyTouchMove(differenceX: number, differenceY: number) {
    this.element.scrollTop -= differenceY
    this.element.scrollLeft -= differenceX
    this.updateGeometry()
  }

  private stopTouchEasing() {
    if (this.touchEasingLoop !== null) {
      this.ownerWindow.clearInterval(this.touchEasingLoop)
      this.touchEasingLoop = null
    }
  }

  private getWheelDelta(event: WheelEvent): [number, number] {
    let deltaX = event.deltaX
    let deltaY = event.deltaY

    const legacyEvent = event as WheelEvent & {
      wheelDelta?: number
      wheelDeltaX?: number
      wheelDeltaY?: number
    }

    if (typeof deltaX === 'undefined' || typeof deltaY === 'undefined') {
      deltaX = legacyEvent.wheelDeltaX ? -legacyEvent.wheelDeltaX / 6 : 0
      deltaY = legacyEvent.wheelDeltaY ? -legacyEvent.wheelDeltaY / 6 : -(legacyEvent.wheelDelta || 0)
    }

    if (event.deltaMode === 1) {
      deltaX *= 10
      deltaY *= 10
    }

    if (Number.isNaN(deltaX) && Number.isNaN(deltaY)) {
      deltaX = 0
      deltaY = -(legacyEvent.wheelDelta || 0)
    }

    return event.shiftKey ? [deltaY, deltaX] : [deltaX, deltaY]
  }

  private shouldPreventWheelDefault(deltaX: number, deltaY: number) {
    const scrollTop = Math.floor(this.element.scrollTop)
    const isTop = this.element.scrollTop <= 0
    const isBottom = scrollTop + this.element.offsetHeight >= this.element.scrollHeight - 1
    const isLeft = this.element.scrollLeft <= 0
    const isRight = this.element.scrollLeft + this.element.offsetWidth >= this.element.scrollWidth - 1

    const hitsBound = Math.abs(deltaY) > Math.abs(deltaX)
      ? (deltaY < 0 && isTop) || (deltaY > 0 && isBottom)
      : (deltaX < 0 && isLeft) || (deltaX > 0 && isRight)

    return hitsBound ? !this.settings.wheelPropagation : true
  }

  private shouldPreventKeyboardDefault(deltaX: number, deltaY: number) {
    const scrollTop = Math.floor(this.element.scrollTop)
    if (deltaX === 0) {
      if (!this.scrollbarYActive) {
        return false
      }
      if (
        (scrollTop <= 0 && deltaY < 0)
        || (scrollTop >= this.contentHeight - this.containerHeight && deltaY > 0)
      ) {
        return !this.settings.wheelPropagation
      }
    }

    const scrollLeft = this.element.scrollLeft
    if (deltaY === 0) {
      if (!this.scrollbarXActive) {
        return false
      }
      if (
        (scrollLeft <= 0 && deltaX < 0)
        || (scrollLeft >= this.contentWidth - this.containerWidth && deltaX > 0)
      ) {
        return !this.settings.wheelPropagation
      }
    }

    return true
  }

  private shouldPreventTouchDefault(deltaX: number, deltaY: number) {
    const scrollTop = Math.floor(this.element.scrollTop)
    const scrollLeft = this.element.scrollLeft

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (
        (deltaY > 0 && scrollTop >= this.contentHeight - this.containerHeight)
        || (deltaY < 0 && scrollTop <= 0)
      ) {
        return this.ownerWindow.scrollY === 0 && deltaY < 0 && this.isChrome()
      }
    }
    else if (
      (deltaX > 0 && scrollLeft >= this.contentWidth - this.containerWidth)
      || (deltaX < 0 && scrollLeft <= 0)
    ) {
      return true
    }

    return true
  }

  private shouldBeConsumedByChild(target: EventTarget | null, deltaX: number, deltaY: number) {
    const targetElement = asElement(target)
    if (!targetElement || !this.element.contains(targetElement)) {
      return false
    }

    let cursor: HTMLElement | null = targetElement
    while (cursor && cursor !== this.element) {
      if (cursor.classList.contains(classNames.childConsume)) {
        return true
      }

      const styles = getStyles(cursor)
      if (deltaY && /scroll|auto/.test(styles.overflowY)) {
        const maxScrollTop = cursor.scrollHeight - cursor.clientHeight
        if (maxScrollTop > 0) {
          if ((cursor.scrollTop > 0 && deltaY < 0) || (cursor.scrollTop < maxScrollTop && deltaY > 0)) {
            return true
          }
        }
      }

      if (deltaX && /scroll|auto/.test(styles.overflowX)) {
        const maxScrollLeft = cursor.scrollWidth - cursor.clientWidth
        if (maxScrollLeft > 0) {
          if ((cursor.scrollLeft > 0 && deltaX < 0) || (cursor.scrollLeft < maxScrollLeft && deltaX > 0)) {
            return true
          }
        }
      }

      cursor = cursor.parentElement
    }

    return false
  }

  private shouldHandleTouch(event: Event) {
    if (event.target === this.scrollbarX || event.target === this.scrollbarY) {
      return false
    }

    const pointerEvent = event as PointerEvent
    if (pointerEvent.pointerType === 'pen' && pointerEvent.buttons === 0) {
      return false
    }

    const touchEvent = event as TouchEvent
    if (touchEvent.targetTouches && touchEvent.targetTouches.length === 1) {
      return true
    }

    return Boolean(
      pointerEvent.pointerType
      && pointerEvent.pointerType !== 'mouse'
      && pointerEvent.pointerType !== 'pen',
    )
  }

  private supportsTouch() {
    const navigator = this.ownerWindow.navigator
    return (
      'ontouchstart' in this.ownerWindow
      || ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0)
    )
  }

  private supportsPointerTouch() {
    return 'PointerEvent' in this.ownerWindow
  }

  private isChrome() {
    return /Chrome/i.test(this.ownerWindow.navigator.userAgent)
  }

  private isHovered() {
    return matches(this.element, ':hover')
  }

  private isThumbFocused() {
    return matches(this.scrollbarX, ':focus') || matches(this.scrollbarY, ':focus')
  }

  private removeClasses() {
    this.element.classList.remove(
      classNames.main,
      classNames.rtl,
      classNames.active('x'),
      classNames.active('y'),
      classNames.scrolling('x'),
      classNames.scrolling('y'),
      classNames.focus,
      ...classNames.dragging('x').split(' '),
      ...classNames.dragging('y').split(' '),
    )
  }
}

export { classNames as perfectScrollbarClassNames }

function createDiv(document: Document, className: string) {
  const div = document.createElement('div')
  div.className = className
  return div
}

function removeElement(element: Element) {
  element.parentNode?.removeChild(element)
}

function setStyles(element: HTMLElement, styles: Record<string, StyleValue>) {
  for (const key in styles) {
    const value = styles[key]
    const normalized = typeof value === 'number' ? `${value}px` : value ?? ''
    element.style.setProperty(toKebabCase(key), normalized)
  }
}

function getStyles(element: Element) {
  return element.ownerDocument.defaultView?.getComputedStyle(element) || getComputedStyle(element)
}

function toInt(value: string | number) {
  return Number.parseInt(String(value), 10) || 0
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function getHorizontalMarginWidth(element: HTMLElement) {
  const styles = getStyles(element)
  return toInt(styles.marginLeft) + toInt(styles.marginRight)
}

function getVerticalMarginHeight(element: HTMLElement) {
  const styles = getStyles(element)
  return toInt(styles.marginTop) + toInt(styles.marginBottom)
}

function outerWidth(element: HTMLElement) {
  const styles = getStyles(element)
  return (
    toInt(styles.width)
    + toInt(styles.paddingLeft)
    + toInt(styles.paddingRight)
    + toInt(styles.borderLeftWidth)
    + toInt(styles.borderRightWidth)
  )
}

function matches(element: Element, query: string) {
  const vendorElement = element as Element & {
    webkitMatchesSelector?: Element['matches']
    msMatchesSelector?: Element['matches']
  }
  const matcher = element.matches
    || vendorElement.webkitMatchesSelector
    || vendorElement.msMatchesSelector

  if (!matcher) {
    return false
  }

  try {
    return matcher.call(element, query)
  }
  catch {
    return false
  }
}

function isEditable(element: Element) {
  return matches(element, 'input,[contenteditable]')
    || matches(element, 'select,[contenteditable]')
    || matches(element, 'textarea,[contenteditable]')
    || matches(element, 'button,[contenteditable]')
}

function getDeepActiveElement(document: Document): Element | null {
  let activeElement = document.activeElement
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement
  }
  return activeElement
}

function asElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !('nodeType' in target) || (target as Node).nodeType !== 1) {
    return null
  }
  return target as HTMLElement
}

function isTouchEvent(event: Event): event is TouchEvent {
  return 'touches' in event
}

function getPagePosition(event: Event, pageField: 'pageX' | 'pageY') {
  if (isTouchEvent(event) && event.touches[0]) {
    return event.touches[0][pageField]
  }

  return (event as MouseEvent)[pageField]
}

function getTouchPoint(event: Event) {
  const touchEvent = event as TouchEvent
  if (touchEvent.targetTouches?.[0]) {
    return touchEvent.targetTouches[0]
  }
  return event as PointerEvent
}

function isCancelable(event: Event) {
  return event.cancelable !== false
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
}
