import { useEffect, useMemo, useState } from "react"
import { Activity, BriefcaseBusiness, CalendarDays, ChevronDown, CircleDollarSign, Inbox, LayoutDashboard, Menu, Moon, Newspaper, PanelLeftClose, PanelLeftOpen, RefreshCcw, Settings2, ShieldCheck, Sparkles, Sun, X } from "lucide-react"
import { BlockRenderer } from "@/components/BlockRenderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import dashboardData from "@/generated/dashboard-data.json"
import type { DashboardData, Snapshot, SourceDefinition } from "@/types"

const data = dashboardData as DashboardData
const domainIcons = { overview: LayoutDashboard, agenda: CalendarDays, inbox: Inbox, work: BriefcaseBusiness, money: CircleDollarSign, news: Newspaper, review: Activity } as const
type ThemeMode = "light" | "dark"

function initialMode(): ThemeMode {
  const stored = localStorage.getItem("zaati-theme")
  if (stored === "light" || stored === "dark") return stored
  if (data.instance.theme.default_mode !== "system") return data.instance.theme.default_mode
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function App() {
  const initialSource = data.sources.find((item) => item.definition.id === "overview:daily")?.definition.id || data.sources[0]?.definition.id || ""
  const [selectedId, setSelectedId] = useState(initialSource)
  const [mode, setMode] = useState<ThemeMode>(initialMode)
  const [palette, setPalette] = useState(() => localStorage.getItem("zaati-palette") || data.instance.theme.preset)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const selected = data.sources.find((item) => item.definition.id === selectedId) || data.sources[0]

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", mode === "dark")
    root.dataset.palette = palette
    root.dataset.density = data.instance.theme.density
    root.style.setProperty("--radius", data.instance.theme.radius)
    const tokenMap = { primary: "--primary", primary_foreground: "--primary-foreground", accent: "--accent", accent_foreground: "--accent-foreground" } as const
    for (const [key, value] of Object.entries(data.instance.theme.custom_tokens)) {
      if (key in tokenMap && /^#[0-9a-f]{6}$/i.test(value || "")) root.style.setProperty(tokenMap[key as keyof typeof tokenMap], value!)
    }
    localStorage.setItem("zaati-theme", mode)
    localStorage.setItem("zaati-palette", palette)
  }, [mode, palette])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar compact={sidebarCompact} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onCompact={() => setSidebarCompact((value) => !value)} onSelect={(id) => { setSelectedId(id); setMobileOpen(false) }} selectedId={selectedId} />
      <div className={cn("transition-[padding] duration-200 md:pl-64", sidebarCompact && "md:pl-[76px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button className="md:hidden" onClick={() => setMobileOpen(true)} size="icon" variant="ghost" aria-label="Open navigation"><Menu className="size-5" /></Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selected?.definition.label || "Dashboard"}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{data.instance.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.demoMode ? <Badge variant="info"><Sparkles className="mr-1 size-3" />Synthetic demo</Badge> : <Badge className="hidden sm:inline-flex" variant="positive"><ShieldCheck className="mr-1 size-3" />Private data</Badge>}
            <Button onClick={() => setMode((value) => value === "light" ? "dark" : "light")} size="icon" variant="ghost" aria-label={`Use ${mode === "light" ? "dark" : "light"} mode`}>{mode === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button>
            <div className="relative">
              <Button onClick={() => setSettingsOpen((value) => !value)} size="icon" variant="outline" aria-expanded={settingsOpen} aria-label="Theme settings"><Settings2 className="size-4" /></Button>
              {settingsOpen ? <ThemeMenu mode={mode} onMode={setMode} onPalette={setPalette} palette={palette} /> : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {selected ? <DashboardPage definition={selected.definition} snapshot={selected.snapshot} /> : <EmptyDashboard />}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ compact, mobileOpen, onClose, onCompact, onSelect, selectedId }: { compact: boolean; mobileOpen: boolean; onClose: () => void; onCompact: () => void; onSelect: (id: string) => void; selectedId: string }) {
  return <>
    {mobileOpen ? <button className="fixed inset-0 z-40 bg-foreground/25 md:hidden" onClick={onClose} aria-label="Close navigation backdrop" /> : null}
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 md:translate-x-0", mobileOpen && "translate-x-0", compact && "md:w-[76px]")}>
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"><span className="text-base font-black tracking-tight">Z</span></div>
        <div className={cn("min-w-0 flex-1", compact && "md:hidden")}><p className="truncate text-sm font-semibold">{data.instance.brand_name}</p><p className="truncate text-[11px] text-sidebar-foreground/60">Private by default</p></div>
        <Button className="md:hidden" onClick={onClose} size="icon" variant="ghost"><X className="size-4" /></Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard sections">
        <p className={cn("px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45", compact && "md:hidden")}>Your system</p>
        {data.sources.map(({ definition, snapshot }) => {
          const Icon = domainIcons[definition.domain as keyof typeof domainIcons] || Activity
          const active = definition.id === selectedId
          return <button className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground", compact && "md:justify-center md:px-2")} key={definition.id} onClick={() => onSelect(definition.id)} title={compact ? definition.label : undefined}><Icon className={cn("size-4 shrink-0 text-sidebar-foreground/55", active && "text-sidebar-primary")} /><span className={cn("min-w-0 flex-1 truncate", compact && "md:hidden")}>{definition.label}</span><span className={cn("size-1.5 rounded-full", snapshot ? snapshot.status === "success" ? "bg-positive" : snapshot.status === "partial" ? "bg-warning" : "bg-destructive" : "bg-muted-foreground", compact && "md:hidden")} /></button>
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent", compact && "md:justify-center md:px-2")} onClick={onCompact}><span className="hidden md:block">{compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</span><ShieldCheck className="size-4 md:hidden" /><span className={cn(compact && "md:hidden")}>{compact ? "Expand" : "Collapse sidebar"}</span></button>
      </div>
    </aside>
  </>
}

function DashboardPage({ definition, snapshot }: { definition: SourceDefinition; snapshot: Snapshot | null }) {
  if (!snapshot) return <section><PageEyebrow definition={definition} snapshot={null} /><div className="mt-16 rounded-xl border border-dashed border-border p-12 text-center"><RefreshCcw className="mx-auto size-7 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Waiting for the first snapshot</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Run the registered prompt and publish one valid file to the worker-owned path. Missing data stays visible, it never becomes a suspiciously confident zero.</p></div></section>
  return (
    <section>
      <PageEyebrow definition={definition} snapshot={snapshot} />
      <div className="mt-5 flex flex-col justify-between gap-5 border-b border-border pb-7 lg:flex-row lg:items-end">
        <div className="max-w-3xl"><h1 className="text-pretty text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{snapshot.data.title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{snapshot.data.summary}</p></div>
        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><span className={cn("size-2 rounded-full", snapshot.status === "success" ? "bg-positive" : snapshot.status === "partial" ? "bg-warning" : "bg-destructive")} /><span>{snapshot.status === "success" ? "All expected inputs" : snapshot.status === "partial" ? "Some evidence limited" : "Source unavailable"}</span><ChevronDown className="size-3.5 opacity-50" /></div>
      </div>
      {snapshot.quality.warnings.length ? <div className="mt-5 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"><RefreshCcw className="mt-0.5 size-4 shrink-0 text-warning-foreground" /><div><p className="text-sm font-medium">Evidence note</p>{snapshot.quality.warnings.map((warning) => <p className="mt-1 text-sm leading-relaxed text-muted-foreground" key={warning}>{warning}</p>)}</div></div> : null}
      <div className={cn("mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3", snapshot.data.presentation.layout === "focus" && "lg:grid-cols-3")}>{snapshot.data.presentation.blocks.map((block) => <BlockRenderer block={block} instance={data.instance} key={block.id} />)}</div>
      <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row"><span>Snapshot {snapshot.snapshot_id}</span><span>{snapshot.quality.confidence} confidence, {snapshot.sources.length} source{snapshot.sources.length === 1 ? "" : "s"}, expires {formatTimestamp(snapshot.freshness.expires_at)}</span></footer>
    </section>
  )
}

function PageEyebrow({ definition, snapshot }: { definition: SourceDefinition; snapshot: Snapshot | null }) {
  const date = snapshot ? new Intl.DateTimeFormat(data.instance.locale, { weekday: "long", month: "long", day: "numeric", timeZone: data.instance.timezone }).format(new Date(snapshot.effective_period.start)) : "No snapshot yet"
  return <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"><span>{date}</span><span className="text-border">/</span><span>{definition.domain}</span>{snapshot?.privacy.synthetic ? <><span className="text-border">/</span><span className="text-info-foreground">Synthetic</span></> : null}</div>
}

function ThemeMenu({ mode, onMode, palette, onPalette }: { mode: ThemeMode; onMode: (mode: ThemeMode) => void; palette: string; onPalette: (palette: string) => void }) {
  return <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"><p className="px-1 text-xs font-semibold">Appearance</p><div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => onMode("light")} size="sm" variant={mode === "light" ? "secondary" : "ghost"}><Sun className="size-3.5" />Light</Button><Button onClick={() => onMode("dark")} size="sm" variant={mode === "dark" ? "secondary" : "ghost"}><Moon className="size-3.5" />Dark</Button></div><Separator className="my-3" /><p className="px-1 text-xs font-semibold">Palette</p><div className="mt-3 grid grid-cols-4 gap-2">{["sage", "ocean", "plum", "sand"].map((item) => <button className={cn("grid place-items-center rounded-lg border p-2 capitalize", palette === item ? "border-primary bg-accent" : "border-border")} key={item} onClick={() => onPalette(item)}><span className={`palette-dot palette-${item}`} /><span className="mt-1 text-[10px]">{item}</span></button>)}</div></div>
}

function EmptyDashboard() { return <div className="grid min-h-[60vh] place-items-center text-center"><div><h1 className="text-xl font-semibold">No sources enabled</h1><p className="mt-2 text-sm text-muted-foreground">Enable a registered source in your instance configuration.</p></div></div> }
function formatTimestamp(value: string) { return new Intl.DateTimeFormat(data.instance.locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: data.instance.timezone }).format(new Date(value)) }
