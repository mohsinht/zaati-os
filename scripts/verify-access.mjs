import process from "node:process"

const hostname = (process.argv[2] || process.env.ZAATI_HOSTNAME || "").trim().toLowerCase()
if (!hostname) throw new Error("Provide a hostname as the first argument or set ZAATI_HOSTNAME.")
const response = await fetch(`https://${hostname}`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(15000) })
const location = response.headers.get("location") || ""
const protectedByRedirect = [301, 302, 303, 307, 308].includes(response.status) && /cloudflareaccess\.com|cdn-cgi\/access/i.test(location)
const protectedByDenial =
  [401, 403].includes(response.status) &&
  /cloudflare|access/i.test(`${response.headers.get("server") || ""} ${await response.text().catch(() => "")}`)
if (!protectedByRedirect && !protectedByDenial) {
  throw new Error(
    `Access preflight failed for ${hostname}. Expected an Access redirect or denial, received HTTP ${response.status}. Do not deploy private snapshots.`,
  )
}
console.log(`Verified that ${hostname} challenges an unauthenticated request.`)
