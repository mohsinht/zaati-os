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
const candidates = [process.env.CHROME_PATH, "/tmp/chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean)
let browser
for (const candidate of candidates) {
  if (await access(candidate, constants.X_OK).then(() => true).catch(() => false)) { browser = candidate; break }
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
    close() { socket.close() },
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
    const summary = violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(", ")}`).join("; ")
    throw new Error(`${label} has ${violations.length} accessibility violation groups. ${summary}`)
  }
  console.log(`${label}: axe found no WCAG A or AA violations.`)
}

async function capture(client, name) {
  if (process.env.ZAATI_CAPTURE_SCREENSHOTS !== "true") return
  const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.resolve("docs/assets", name), Buffer.from(result.data, "base64"))
}

const profile = await mkdtemp(path.join(tmpdir(), "zaati-a11y-"))
const vite = path.resolve("node_modules/.bin", process.platform === "win32" ? "vite.cmd" : "vite")
const preview = process.env.ZAATI_A11Y_URL ? null : spawn(vite, ["preview", "--host", host, "--port", String(appPort)], { stdio: "ignore", shell: process.platform === "win32" })
let chrome
try {
  await waitForJson(`${appUrl}/data/dashboard-data.json`)
  chrome = spawn(browser, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, appUrl], { stdio: "ignore" })
  const targets = await waitForJson(`http://${host}:${debugPort}/json`)
  const page = targets.find((target) => target.type === "page")
  if (!page) throw new Error("Chromium did not expose a page target.")
  const client = cdp(page.webSocketDebuggerUrl)
  await client.send("Runtime.enable")
  await client.send("Page.enable")
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await client.send("Page.reload", { ignoreCache: true })
  await audit(client, "Desktop light tutorial")
  await capture(client, "onboarding-light.png")
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Explore the demo'))?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await audit(client, "Desktop light dashboard")
  await capture(client, "dashboard-light.png")
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Start here')?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await client.send("Runtime.evaluate", { expression: "document.querySelector('button[aria-label=\"Use dark mode\"]')?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await audit(client, "Desktop dark tutorial")
  await capture(client, "onboarding-dark.png")
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Explore the demo'))?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await audit(client, "Desktop dark dashboard")
  await capture(client, "dashboard-dark.png")
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send("Page.reload", { ignoreCache: true })
  await waitForApp(client)
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Start here')?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await audit(client, "Mobile tutorial")
  await capture(client, "onboarding-mobile.png")
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Explore the demo'))?.click()" })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await audit(client, "Mobile dashboard")
  await capture(client, "dashboard-mobile.png")
  client.close()
} finally {
  chrome?.kill("SIGTERM")
  preview?.kill("SIGTERM")
  await rm(profile, { recursive: true, force: true })
}
