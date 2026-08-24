import { gzipSync } from "node:zlib"
import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : [file]
  }))).flat()
}

const dist = path.resolve("dist")
await stat(dist).catch(() => { throw new Error("dist is missing. Run npm run build first.") })
const output = await files(dist)
const index = await readFile(path.join(dist, "index.html"), "utf8")
const referenced = new Set([...index.matchAll(/(?:src|href)="\/?([^"]+\.(?:js|css))"/g)].map((match) => match[1]))
const queue = [...referenced].filter((file) => file.endsWith(".js"))
while (queue.length) {
  const current = queue.shift()
  const content = await readFile(path.join(dist, current), "utf8")
  for (const match of content.matchAll(/["'`]\.\/([^"'`]+\.(?:js|css))["'`]/g)) {
    const dependency = `assets/${match[1]}`
    if (!referenced.has(dependency)) {
      referenced.add(dependency)
      if (dependency.endsWith(".js")) queue.push(dependency)
    }
  }
}
const selected = output.filter((file) => referenced.has(path.relative(dist, file).replaceAll(path.sep, "/")) || file.endsWith("dashboard-data.json"))
const sizes = await Promise.all(selected.map(async (file) => ({ file, raw: (await stat(file)).size, gzip: gzipSync(await readFile(file)).length })))
const js = sizes.filter((item) => item.file.endsWith(".js"))
const css = sizes.filter((item) => item.file.endsWith(".css"))
const data = sizes.find((item) => item.file.endsWith("dashboard-data.json"))
const total = (items) => items.reduce((sum, item) => sum + item.gzip, 0)
const budgets = {
  totalJs: Number(process.env.ZAATI_BUDGET_JS_GZIP || 120_000),
  css: Number(process.env.ZAATI_BUDGET_CSS_GZIP || 20_000),
  data: Number(process.env.ZAATI_BUDGET_DATA_GZIP || 120_000),
}
const results = { totalJs: total(js), css: total(css), data: data?.gzip || 0 }
const failures = Object.entries(results).filter(([key, value]) => value > budgets[key])
console.log(`Performance budgets: JavaScript ${Math.ceil(results.totalJs / 1024)} KB gzip, CSS ${Math.ceil(results.css / 1024)} KB gzip, dashboard data ${Math.ceil(results.data / 1024)} KB gzip.`)
if (failures.length) throw new Error(failures.map(([key, value]) => `${key} is ${value} bytes, budget ${budgets[key]} bytes`).join("; "))
