import { expect, test } from '@nuxt/test-utils/playwright'

test('renders styled component and directive scrollbars in a real browser', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const component = page.getByTestId('component-scroll')
  const directive = page.getByTestId('directive-scroll')

  await expect(component).toHaveClass(/nps/)
  await expect(component).toHaveClass(/nps--active-y/)
  await expect(directive).toHaveClass(/nps/)
  await expect(directive).toHaveClass(/nps-theme-browser/)
  await expect(directive).toHaveClass(/nps--active-y/)
  await expect(directive).not.toHaveClass(/nps--active-x/)

  const metrics = await component.evaluate((element) => {
    const rail = Array.from(element.children).find(child =>
      child.classList.contains('nps__rail-y'),
    ) as HTMLElement | undefined
    const thumb = rail?.querySelector<HTMLElement>('.nps__thumb-y')

    if (!rail || !thumb) {
      return null
    }

    return {
      overflow: getComputedStyle(element).overflow,
      railDisplay: getComputedStyle(rail).display,
      railWidth: getComputedStyle(rail).width,
      thumbBackground: getComputedStyle(thumb).backgroundColor,
      thumbHeight: Number.parseFloat(getComputedStyle(thumb).height),
      thumbWidth: Number.parseFloat(getComputedStyle(thumb).width),
    }
  })

  expect(metrics).not.toBeNull()
  expect(metrics?.overflow).toBe('hidden')
  expect(metrics?.railDisplay).toBe('block')
  expect(metrics?.railWidth).toBe('14px')
  expect(metrics?.thumbBackground).toBe('rgba(13, 148, 136, 0.75)')
  expect(metrics?.thumbHeight).toBeGreaterThanOrEqual(36)
  expect(metrics?.thumbWidth).toBe(6)
})

test('applies hover styling to rails and thumbs', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const rail = page.getByTestId('component-scroll').locator(':scope > .nps__rail-y')
  await rail.hover()
  await page.waitForTimeout(220)

  const hoverMetrics = await rail.evaluate((element) => {
    const thumb = element.querySelector<HTMLElement>('.nps__thumb-y')

    return {
      railBackground: getComputedStyle(element).backgroundColor,
      railOpacity: getComputedStyle(element).opacity,
      thumbBackground: thumb ? getComputedStyle(thumb).backgroundColor : '',
      thumbWidth: thumb ? Number.parseFloat(getComputedStyle(thumb).width) : 0,
    }
  })

  expect(hoverMetrics.railBackground).toBe('rgba(209, 250, 229, 0.9)')
  expect(hoverMetrics.railOpacity).toBe('1')
  expect(hoverMetrics.thumbBackground).toBe('rgba(225, 29, 72, 0.9)')
  expect(hoverMetrics.thumbWidth).toBeGreaterThanOrEqual(10)
})

test('keeps separate scrollbar instances hover and wheel state independent', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const component = page.getByTestId('component-scroll')
  const directive = page.getByTestId('directive-scroll')
  const componentRail = component.locator(':scope > .nps__rail-y')
  const directiveRail = directive.locator(':scope > .nps__rail-y')

  await page.mouse.move(5, 5)
  await page.waitForTimeout(220)

  await expect.poll(async () => componentRail.evaluate(element => getComputedStyle(element).opacity)).toBe('0')
  await expect.poll(async () => directiveRail.evaluate(element => getComputedStyle(element).opacity)).toBe('0')

  await component.hover()
  await page.waitForTimeout(220)

  expect(Number(await componentRail.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(0)
  await expect.poll(async () => directiveRail.evaluate(element => getComputedStyle(element).opacity)).toBe('0')

  await directive.hover()
  await page.waitForTimeout(220)

  expect(Number(await directiveRail.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(0)
  await expect.poll(async () => componentRail.evaluate(element => getComputedStyle(element).opacity)).toBe('0')

  await component.evaluate((element) => {
    element.scrollTop = 0
  })
  await directive.evaluate((element) => {
    element.scrollTop = 0
  })

  await directive.hover()
  await page.mouse.wheel(0, 120)

  await expect.poll(async () => directive.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await component.evaluate(element => element.scrollTop)).toBe(0)

  const directiveScrollTop = await directive.evaluate(element => element.scrollTop)
  await component.hover()
  await page.mouse.wheel(0, 120)

  await expect.poll(async () => component.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await directive.evaluate(element => element.scrollTop)).toBe(directiveScrollTop)
})

test('scrolls with wheel and keeps nested scroll consumption local', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const component = page.getByTestId('component-scroll')
  await component.hover()
  await page.mouse.wheel(0, 120)
  await expect(component).toHaveClass(/nps--scrolling-y/)

  const wheelScrollTop = await component.evaluate(element => element.scrollTop)
  expect(wheelScrollTop).toBeGreaterThan(0)

  await component.evaluate((element) => {
    element.scrollTop = 0
  })

  const nested = page.getByTestId('nested-scroll')
  await nested.scrollIntoViewIfNeeded()
  await nested.evaluate((element) => {
    element.scrollTop = 0
  })
  const parentScrollTopBefore = await component.evaluate(element => element.scrollTop)
  const nestedBox = await nested.boundingBox()

  expect(nestedBox).not.toBeNull()
  if (!nestedBox) {
    return
  }

  await page.mouse.move(nestedBox.x + nestedBox.width / 2, nestedBox.y + nestedBox.height / 2)
  await page.mouse.wheel(0, 500)

  await expect.poll(async () => nested.evaluate(element => element.scrollTop)).toBeGreaterThan(0)

  const scrollPositions = await page.evaluate(() => {
    const componentElement = document.querySelector<HTMLElement>('[data-testid="component-scroll"]')
    const nestedElement = document.querySelector<HTMLElement>('[data-testid="nested-scroll"]')

    return {
      componentTop: componentElement?.scrollTop ?? -1,
      nestedTop: nestedElement?.scrollTop ?? -1,
    }
  })

  expect(scrollPositions.componentTop).toBe(parentScrollTopBefore)
  expect(scrollPositions.nestedTop).toBeGreaterThan(0)
})

test('keeps wheel scrolling local for nested PerfectScrollbar instances', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const component = page.getByTestId('component-scroll')
  const nested = page.getByTestId('nested-perfect-scroll')

  await expect(nested).toHaveClass(/nps/)
  await expect(nested).toHaveClass(/nps--active-y/)

  await nested.scrollIntoViewIfNeeded()
  await nested.evaluate((element) => {
    element.scrollTop = 0
  })
  const parentScrollTopBefore = await component.evaluate(element => element.scrollTop)

  const nestedBox = await nested.boundingBox()
  expect(nestedBox).not.toBeNull()
  if (!nestedBox) {
    return
  }

  await page.mouse.move(nestedBox.x + nestedBox.width / 2, nestedBox.y + nestedBox.height / 2)
  await page.mouse.wheel(0, 120)

  await expect.poll(async () => nested.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await component.evaluate(element => element.scrollTop)).toBe(parentScrollTopBefore)
})

test('drags the thumb in a real browser', async ({ goto, page }) => {
  await goto('/', { waitUntil: 'hydration' })

  const component = page.getByTestId('component-scroll')
  const thumb = component.locator(':scope > .nps__rail-y > .nps__thumb-y')
  const box = await thumb.boundingBox()

  expect(box).not.toBeNull()
  if (!box) {
    return
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 50)

  await expect(component).toHaveClass(/nps--dragging-y/)

  await page.mouse.up()

  const scrollTop = await component.evaluate(element => element.scrollTop)
  expect(scrollTop).toBeGreaterThan(0)
  await expect(component).not.toHaveClass(/nps--dragging-y/)
})
