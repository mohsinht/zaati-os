// Preserve intrinsic card heights on wide dashboards while packing later cards into free column space.
const dashboardSelector = '[data-layout="dashboard"]'
const wideDashboard = window.matchMedia("(min-width: 1280px)")
const verticalGap = 20
const observedItems = new Set<HTMLElement>()
const pendingFrames = new WeakMap<HTMLElement, number>()

function dashboardGrids() {
  return Array.from(document.querySelectorAll<HTMLElement>(dashboardSelector))
}

function resetGrid(grid: HTMLElement) {
  grid.style.removeProperty("grid-auto-rows")
  grid.style.removeProperty("grid-auto-flow")
  grid.style.removeProperty("row-gap")
  for (const child of Array.from(grid.children)) {
    if (!(child instanceof HTMLElement)) continue
    child.style.removeProperty("align-self")
    child.style.removeProperty("grid-row-end")
  }
}

function measureGrid(grid: HTMLElement) {
  if (!grid.isConnected) return
  if (!wideDashboard.matches) {
    resetGrid(grid)
    return
  }

  grid.style.gridAutoRows = "1px"
  grid.style.gridAutoFlow = "dense"
  grid.style.rowGap = "0px"

  for (const child of Array.from(grid.children)) {
    if (!(child instanceof HTMLElement)) continue
    child.style.alignSelf = "start"
    const height = Math.ceil(child.getBoundingClientRect().height)
    child.style.gridRowEnd = `span ${Math.max(1, height + verticalGap)}`
  }
}

function scheduleGrid(grid: HTMLElement) {
  const pending = pendingFrames.get(grid)
  if (pending !== undefined) cancelAnimationFrame(pending)
  pendingFrames.set(
    grid,
    requestAnimationFrame(() => {
      pendingFrames.delete(grid)
      measureGrid(grid)
    }),
  )
}

const resizeObserver = new ResizeObserver((entries) => {
  const grids = new Set<HTMLElement>()
  for (const entry of entries) {
    const grid = entry.target.parentElement
    if (grid instanceof HTMLElement && grid.matches(dashboardSelector)) grids.add(grid)
  }
  for (const grid of grids) scheduleGrid(grid)
})

function syncDashboardLayout() {
  const currentItems = new Set<HTMLElement>()
  for (const grid of dashboardGrids()) {
    for (const child of Array.from(grid.children)) {
      if (!(child instanceof HTMLElement)) continue
      currentItems.add(child)
      if (!observedItems.has(child)) resizeObserver.observe(child)
    }
    scheduleGrid(grid)
  }

  for (const item of observedItems) {
    if (currentItems.has(item)) continue
    resizeObserver.unobserve(item)
    observedItems.delete(item)
  }
  for (const item of currentItems) observedItems.add(item)
}

const mutationObserver = new MutationObserver(() => syncDashboardLayout())
mutationObserver.observe(document.body, { childList: true, subtree: true })
wideDashboard.addEventListener("change", () => syncDashboardLayout())
queueMicrotask(syncDashboardLayout)
