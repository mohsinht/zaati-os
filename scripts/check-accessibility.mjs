import { spawn } from "node:child_process"
import { constants } from "node:fs"
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"

const require = createRequire(import.meta.url)
const axe = require("axe-core")
const host = "127.0.0.1"
const appPort = 4300 + (process.pid % 500)
const debugPort = 9300 + (process.pid % 500)
const appUrl = process.env.ZAATI_A11Y_URL || `http://${host}:${appPort}`
const candidates = [
  process.env.CHROME_PATH,
  "/tmp/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean)
let browser
for (const candidate of candidates) {
  if (
    await access(candidate, constants.X_OK)
      .then(() => true)
      .catch(() => false)
  ) {
    browser = candidate
    break
  }
}
if (!browser) throw new Error("Accessibility validation requires Chromium or Chrome. Set CHROME_PATH to the executable.")

async function waitForJson(url, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${url}.`)
}

function cdp(url) {
  const socket = new WebSocket(url)
  let nextId = 1
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true })
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chromium DevTools.")), { once: true })
  })
  return {
    async send(method, params = {}) {
      await opened
      const id = nextId++
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      socket.send(JSON.stringify({ id, method, params }))
      return response
    },
    close() {
      socket.close()
    },
  }
}

async function waitForApp(client) {
  await new Promise((resolve) => setTimeout(resolve, 250))
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression:
        "document.readyState === 'complete' && Boolean(document.querySelector('h1')) && !document.querySelector('[aria-label=\"Loading chart\"]')",
      returnByValue: true,
    })
    if (result.result?.value) {
      await client.send("Runtime.evaluate", {
        expression: "Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))",
        awaitPromise: true,
      })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error("The dashboard did not become ready for accessibility validation.")
}

async function audit(client, label) {
  await waitForApp(client)
  await client.send("Runtime.evaluate", { expression: axe.source })
  const evaluation = await client.send("Runtime.evaluate", {
    expression: `(async () => await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }))()`,
    awaitPromise: true,
    returnByValue: true,
  })
  const result = evaluation.result?.value
  if (!result) throw new Error(`Axe did not return a result for ${label}.`)
  const violations = result.violations || []
  if (violations.length) {
    const summary = violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(" "))
            .join(", ")}`,
      )
      .join("; ")
    throw new Error(`${label} has ${violations.length} accessibility violation groups. ${summary}`)
  }
  console.log(`${label}: axe found no WCAG A or AA violations.`)
}

async function capture(client, name) {
  if (process.env.ZAATI_CAPTURE_SCREENSHOTS !== "true") return
  if (process.env.ZAATI_SCREENSHOT_DIR && /^(dashboard|onboarding)-/.test(name)) return
  const directory = process.env.ZAATI_SCREENSHOT_DIR || "docs/assets"
  await mkdir(directory, { recursive: true })
  const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })
  await writeFile(path.resolve(directory, name), Buffer.from(result.data, "base64"))
}

async function stop(child) {
  if (!child || child.exitCode !== null) return
  const exited = new Promise((resolve) => child.once("exit", resolve))
  child.kill("SIGTERM")
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))])
}

const profile = await mkdtemp(path.join(tmpdir(), "zaati-a11y-"))
const vite = path.resolve("node_modules/.bin", process.platform === "win32" ? "vite.cmd" : "vite")
const preview = process.env.ZAATI_A11Y_URL
  ? null
  : spawn(vite, ["preview", "--outDir", process.env.ZAATI_A11Y_DIST || "dist", "--host", host, "--port", String(appPort)], {
      stdio: "ignore",
      shell: process.platform === "win32",
    })
let chrome
try {
  await waitForJson(`${appUrl}/data/dashboard-data.json`)
  chrome = spawn(
    browser,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      appUrl,
    ],
    { stdio: "ignore" },
  )
  const targets = await waitForJson(`http://${host}:${debugPort}/json`)
  const page = targets.find((target) => target.type === "page")
  if (!page) throw new Error("Chromium did not expose a page target.")
  const client = cdp(page.webSocketDebuggerUrl)
  await client.send("Runtime.enable")
  await client.send("Page.enable")
  const dashboard = await waitForJson(`${appUrl}/data/dashboard-data.json`)
  if (process.env.ZAATI_CAPTURE_SCREENSHOTS === "true" && !dashboard.syntheticData)
    throw new Error("Screenshot capture requires an entirely synthetic dashboard.")
  const views = ["start", ...(dashboard.demoMode ? ["components"] : []), ...dashboard.sources.map((source) => source.definition.id)]
  const reviewAt = dashboard.demoMode
    ? dashboard.sources
        .map((source) => source.snapshot?.generated_at)
        .filter(Boolean)
        .sort()
        .at(-1) || dashboard.generatedAt
    : dashboard.generatedAt
  const viewUrl = (view) => `${appUrl}?view=${encodeURIComponent(view)}&at=${encodeURIComponent(reviewAt)}`
  const viewports = [320, 390, 768, 1024, 1440]
  for (const width of viewports) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 768 ? 844 : 1000,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
    for (const mode of ["light", "dark"]) {
      await client.send("Runtime.evaluate", {
        expression: `localStorage.setItem("zaati-theme", "${mode}"); localStorage.setItem("zaati-demo-tour", "complete")`,
      })
      for (const view of views) {
        await client.send("Page.navigate", { url: viewUrl(view) })
        await audit(client, `${width}px ${mode} ${view}`)
        const overflow = await client.send("Runtime.evaluate", {
          expression: "document.documentElement.scrollWidth > innerWidth",
          returnByValue: true,
        })
        if (overflow.result?.value) throw new Error(`${width}px ${mode} ${view} overflows the document.`)
        if ([390, 1440].includes(width) && dashboard.sources.some((source) => source.definition.id === view))
          await capture(client, `${view.split(":")[0]}-${width}-${mode}.png`)
      }
    }
  }

  const tableSource = dashboard.sources.find(({ snapshot }) =>
    snapshot?.data.presentation.blocks.some((b) => b.kind === "table" && b.searchable && b.columns.some((c) => c.filterable)),
  )
  if (tableSource) {
    await client.send("Page.navigate", { url: viewUrl(tableSource.definition.id) })
    await waitForApp(client)
    await client.send("Runtime.evaluate", { expression: "document.querySelector('[role=search] input').focus()" })
    await client.send("Input.insertText", { text: "no-matching-example-item-98765" })
    const tableInteraction = await client.send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = () => new Promise(r => setTimeout(r, 80)); await wait();
        const search = document.querySelector('[role=search]');
        const panel = search.closest('.zaati-block');
        const empty = panel.textContent.includes('No matching items');
        [...search.querySelectorAll('button')].find(b => b.textContent === 'Clear').click(); await wait();
        const restored = panel.querySelectorAll('tbody tr').length > 1;
        const select = search.querySelector('select'); select.value = select.options[1].value;
        select.dispatchEvent(new Event('change', { bubbles: true })); await wait();
        const filtered = [...panel.querySelectorAll('tbody tr')].every(row => row.textContent.includes(select.value));
        [...search.querySelectorAll('button')].find(b => b.textContent === 'Clear').click(); await wait();
        const header = panel.querySelector('th'); header.querySelector('button').click(); await wait();
        const ascending = header.getAttribute('aria-sort') === 'ascending';
        header.querySelector('button').click(); await wait();
        return empty && restored && filtered && ascending && header.getAttribute('aria-sort') === 'descending';
      })()`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (!tableInteraction.result?.value) throw new Error("Table search, filters, clear, or sorting failed.")
    console.log("Table search, empty results, filtering, clearing, and sorting passed.")
  }

  const chartSource = dashboard.sources.find(({ snapshot }) => {
    const blocks = snapshot?.data.presentation.blocks || []
    return blocks.some((block) => block.kind === "donut-chart") && blocks.some((block) => ["line-chart", "bar-chart"].includes(block.kind))
  })
  if (chartSource) {
    await client.send("Page.navigate", { url: viewUrl(chartSource.definition.id) })
    await waitForApp(client)
    const interaction = await client.send("Runtime.evaluate", {
      expression: `(async () => {
      const button = document.querySelector('.chart-donut button');
      if (!button) return false;
      button.click(); await new Promise(r => setTimeout(r, 50)); const selected = button.getAttribute('aria-pressed') === 'true';
      button.click(); await new Promise(r => setTimeout(r, 50)); const cleared = button.getAttribute('aria-pressed') === 'false';
      const details = document.querySelector('.chart-values'); details.querySelector('summary').click();
      return { selected, cleared, data: details.open && details.querySelectorAll('td').length > 0 };
    })()`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (!interaction.result?.value?.data || !interaction.result?.value?.selected || !interaction.result?.value?.cleared)
      throw new Error("Chart selection or data disclosure failed.")
    await client.send("Runtime.evaluate", { expression: "document.querySelector('.chart-donut button').focus()" })
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 })
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 })
    const keyboard = await client.send("Runtime.evaluate", {
      expression: "document.activeElement?.getAttribute('aria-pressed') === 'true'",
      returnByValue: true,
    })
    if (!keyboard.result?.value) throw new Error("Keyboard donut selection failed.")
    console.log("Chart disclosure, selection toggle, and keyboard Space activation passed.")
  }
  await client.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await client.send("Page.navigate", { url: viewUrl("money:pulse") })
  await audit(client, "Reduced-motion money dashboard")
  const motion = await client.send("Runtime.evaluate", {
    expression:
      "Array.from(document.querySelectorAll('.zaati-block, .chart-series-reveal, .chart-bar')).every(el => parseFloat(getComputedStyle(el).animationDuration) <= 0.001)",
    returnByValue: true,
  })
  if (!motion.result?.value) throw new Error("Reduced motion is not respected.")
  await client.send("Emulation.setEmulatedMedia", { features: [] })
  for (const palette of ["ocean", "plum", "sand"]) {
    for (const mode of ["light", "dark"]) {
      await client.send("Runtime.evaluate", {
        expression: `localStorage.setItem('zaati-palette', '${palette}'); localStorage.setItem('zaati-theme', '${mode}')`,
      })
      await client.send("Page.navigate", { url: viewUrl("components") })
      await audit(client, `${palette} ${mode} component palette`)
    }
  }
  await client.send("Runtime.evaluate", { expression: "localStorage.removeItem('zaati-palette')" })

  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send("Runtime.evaluate", { expression: `localStorage.setItem("zaati-theme", "light")` })
  await client.send("Page.navigate", { url: viewUrl("start") })
  await waitForApp(client)
  await client.send("Runtime.evaluate", { expression: `document.querySelector('button[aria-label="Open navigation"]')?.click()` })
  await audit(client, "Mobile navigation open")

  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await client.send("Runtime.evaluate", { expression: `localStorage.removeItem("zaati-demo-tour")` })
  await client.send("Page.navigate", { url: viewUrl("start") })
  await audit(client, "Desktop first-run demo tour")
  await client.send("Runtime.evaluate", {
    expression: `Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Skip tour"))?.click()`,
  })
  await client.send("Runtime.evaluate", { expression: `localStorage.setItem("zaati-demo-tour", "complete")` })

  await client.send("Page.navigate", { url: viewUrl("overview:daily") })
  await waitForApp(client)
  await client.send("Runtime.evaluate", { expression: `document.querySelector('button[aria-label="Open theme studio"]')?.click()` })
  await audit(client, "Desktop theme studio open")

  await client.send("Page.navigate", { url: viewUrl("money:pulse") })
  await waitForApp(client)
  await client.send("Runtime.evaluate", {
    expression: `Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Recreate this page"))?.click()`,
  })
  await audit(client, "Desktop scheduled-task prompt open")

  await client.send("Page.navigate", { url: viewUrl("start") })
  await audit(client, "Desktop tutorial screenshot")
  await capture(client, "onboarding-light.png")
  await client.send("Page.navigate", { url: viewUrl("overview:daily") })
  await audit(client, "Desktop dashboard screenshot")
  await capture(client, "dashboard-light.png")
  await client.send("Runtime.evaluate", { expression: `localStorage.setItem("zaati-theme", "dark")` })
  await client.send("Page.navigate", { url: viewUrl("start") })
  await audit(client, "Desktop dark tutorial screenshot")
  await capture(client, "onboarding-dark.png")
  await client.send("Page.navigate", { url: viewUrl("overview:daily") })
  await audit(client, "Desktop dark dashboard screenshot")
  await capture(client, "dashboard-dark.png")
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send("Page.navigate", { url: viewUrl("start") })
  await audit(client, "Mobile tutorial screenshot")
  await capture(client, "onboarding-mobile.png")
  await client.send("Page.navigate", { url: viewUrl("overview:daily") })
  await audit(client, "Mobile dashboard screenshot")
  await capture(client, "dashboard-mobile.png")
  client.close()
} finally {
  await stop(chrome)
  await stop(preview)
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
