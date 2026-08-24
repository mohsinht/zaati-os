import process from "node:process"

const hostname = (process.argv[2] || process.env.ZAATI_HOSTNAME || "").trim().toLowerCase()
if (!hostname) throw new Error("Provide a hostname as the first argument or set ZAATI_HOSTNAME.")
const paths = ["/", "/data/dashboard-data.json", "/assets/zaati-access-probe.js"]
for (const pathname of paths) {
  const response = await fetch(`https://${hostname}${pathname}`, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: { "user-agent": "zaati-access-preflight/0.1.1" },
  })
  const location = response.headers.get("location") || ""
  const protectedByRedirect = [301, 302, 303, 307, 308].includes(response.status) && /cloudflareaccess\.com|cdn-cgi\/access/i.test(location)
  const body = await response.text().catch(() => "")
  const protectedByDenial =
    [401, 403].includes(response.status) && /cloudflare|access/i.test(`${response.headers.get("server") || ""} ${body}`)
  if (!protectedByRedirect && !protectedByDenial) {
    throw new Error(
      `Access preflight failed for ${hostname}${pathname}. Expected an Access redirect or denial, received HTTP ${response.status}. Do not deploy private snapshots.`,
    )
  }
}
console.log(`Verified that ${hostname} challenges unauthenticated HTML, data, and asset requests.`)
