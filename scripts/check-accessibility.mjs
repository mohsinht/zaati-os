import { spawn } from "node:child_process"
import { constants } from "node:fs"
import { access, mkdtemp, rm, writeFile } from "node:fs/promises"
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
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", { expression: "Boolean(document.querySelector('h1'))", returnByValue: true })
    if (result.result?.value) return
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
  const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.resolve("docs/assets", name), Buffer.from(result.data, "base64"))
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
  : spawn(vite, ["preview", "--host", host, "--port", String(appPort)], { stdio: "ignore", shell: process.platform === "win32" })
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
  const views = ["start", ...(dashboard.demoMode ? ["components"] : []), ...dashboard.sources.map((source) => source.definition.id)]
  const viewUrl = (view) => `${appUrl}?view=${encodeURIComponent(view)}&at=${encodeURIComponent(dashboard.generatedAt)}`
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
      }
    }
  }

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
