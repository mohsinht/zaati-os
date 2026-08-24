import { lazy, Suspense, useEffect, useState } from "react"
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react"
import { BlockRenderer } from "@/components/BlockRenderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { DashboardData, InstanceConfig, Snapshot, SourceDefinition } from "@/types"

const Onboarding = lazy(() => import("@/components/Onboarding"))
const domainIcons = {
  overview: LayoutDashboard,
  agenda: CalendarDays,
  inbox: Inbox,
  work: BriefcaseBusiness,
  money: CircleDollarSign,
  news: Newspaper,
  review: Activity,
} as const
const START_ID = "__start"
type ThemeMode = "light" | "dark"
type Density = "compact" | "comfortable"
type FontFamily = InstanceConfig["theme"]["font_family"]
type HeadingStyle = InstanceConfig["theme"]["heading_style"]

function initialMode(data: DashboardData): ThemeMode {
  const stored = localStorage.getItem("zaati-theme")
  if (stored === "light" || stored === "dark") return stored
  if (data.instance.theme.default_mode !== "system") return data.instance.theme.default_mode
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch("/data/dashboard-data.json", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Dashboard data returned ${response.status}.`)
        return response.json() as Promise<DashboardData>
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return
        setError(reason instanceof Error ? reason.message : "Dashboard data could not be loaded.")
      })
    return () => controller.abort()
  }, [])
  if (error) return <LoadError message={error} />
  if (!data) return <AppLoading />
  return <DashboardApp data={data} />
}

function DashboardApp({ data }: { data: DashboardData }) {
  const overviewId =
    data.sources.find((item) => item.definition.id === "overview:daily")?.definition.id || data.sources[0]?.definition.id || ""
  const [selectedId, setSelectedId] = useState(data.demoMode ? START_ID : overviewId)
  const [mode, setMode] = useState<ThemeMode>(() => initialMode(data))
  const [palette, setPalette] = useState(() => localStorage.getItem("zaati-palette") || data.instance.theme.preset)
  const [density, setDensity] = useState<Density>(() => (localStorage.getItem("zaati-density") as Density) || data.instance.theme.density)
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    () => (localStorage.getItem("zaati-font") as FontFamily) || data.instance.theme.font_family,
  )
  const [headingStyle, setHeadingStyle] = useState<HeadingStyle>(
    () => (localStorage.getItem("zaati-headings") as HeadingStyle) || data.instance.theme.heading_style,
  )
  const [radius, setRadius] = useState(() => localStorage.getItem("zaati-radius") || data.instance.theme.radius)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const selected = data.sources.find((item) => item.definition.id === selectedId)
  const selectedLabel = selectedId === START_ID ? "Start here" : selected?.definition.label || "Dashboard"

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", mode === "dark")
    root.dataset.palette = palette
    root.dataset.density = density
    root.dataset.font = fontFamily
    root.dataset.heading = headingStyle
    root.style.setProperty("--radius", radius)
    const tokenMap = {
      primary: "--primary",
      primary_foreground: "--primary-foreground",
      accent: "--accent",
      accent_foreground: "--accent-foreground",
      background: "--background",
      foreground: "--foreground",
      card: "--card",
      border: "--border",
      sidebar: "--sidebar",
      chart_1: "--chart-1",
      chart_2: "--chart-2",
      chart_3: "--chart-3",
    } as const
    for (const token of Object.values(tokenMap)) root.style.removeProperty(token)
    if (palette === "custom") {
      for (const [key, value] of Object.entries(data.instance.theme.custom_tokens)) {
        if (key in tokenMap && /^#[0-9a-f]{6}$/i.test(value)) root.style.setProperty(tokenMap[key as keyof typeof tokenMap], value)
      }
    }
    document.title = data.instance.brand_name
    document.documentElement.lang = data.instance.locale.split("-")[0]
    localStorage.setItem("zaati-theme", mode)
    localStorage.setItem("zaati-palette", palette)
    localStorage.setItem("zaati-density", density)
    localStorage.setItem("zaati-font", fontFamily)
    localStorage.setItem("zaati-headings", headingStyle)
    localStorage.setItem("zaati-radius", radius)
  }, [data.instance, density, fontFamily, headingStyle, mode, palette, radius])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [])

  const select = (id: string) => {
    setSelectedId(id)
    setMobileOpen(false)
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <Sidebar
        compact={sidebarCompact}
        data={data}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onCompact={() => setSidebarCompact((value) => !value)}
        onSelect={select}
        selectedId={selectedId}
      />
      <div className={cn("transition-[padding] duration-200 md:pl-64", sidebarCompact && "md:pl-[76px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              size="icon"
              variant="ghost"
              aria-controls="primary-navigation"
              aria-expanded={mobileOpen}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedLabel}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{data.instance.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.demoMode ? (
              <Badge variant="info">
                <Sparkles className="mr-1 size-3" />
                Synthetic demo
              </Badge>
            ) : (
              <Badge className="hidden sm:inline-flex" variant="positive">
                <ShieldCheck className="mr-1 size-3" />
                Private data
              </Badge>
            )}
            <Button
              onClick={() => setMode((value) => (value === "light" ? "dark" : "light"))}
              size="icon"
              variant="ghost"
              aria-label={`Use ${mode === "light" ? "dark" : "light"} mode`}
            >
              {mode === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
            <div className="relative">
              <Button
                onClick={() => setSettingsOpen((value) => !value)}
                size="icon"
                variant="outline"
                aria-controls="theme-studio"
                aria-expanded={settingsOpen}
                aria-label="Open theme studio"
              >
                <Settings2 className="size-4" />
              </Button>
              {settingsOpen ? (
                <ThemeMenu
                  density={density}
                  fontFamily={fontFamily}
                  headingStyle={headingStyle}
                  mode={mode}
                  onClose={() => setSettingsOpen(false)}
                  onDensity={setDensity}
                  onFont={setFontFamily}
                  onHeading={setHeadingStyle}
                  onMode={setMode}
                  onPalette={setPalette}
                  onRadius={setRadius}
                  palette={palette}
                  radius={radius}
                />
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="main-content" tabIndex={-1}>
          {selectedId === START_ID ? (
            <Suspense fallback={<InlineLoading />}>
              <Onboarding instance={data.instance} onOpenDashboard={() => select(overviewId)} />
            </Suspense>
          ) : selected ? (
            <DashboardPage definition={selected.definition} instance={data.instance} snapshot={selected.snapshot} />
          ) : (
            <EmptyDashboard />
          )}
        </main>
      </div>
    </div>
  )
}

function Sidebar({
  compact,
  data,
  mobileOpen,
  onClose,
  onCompact,
  onSelect,
  selectedId,
}: {
  compact: boolean
  data: DashboardData
  mobileOpen: boolean
  onClose: () => void
  onCompact: () => void
  onSelect: (id: string) => void
  selectedId: string
}) {
  return (
    <>
      {mobileOpen ? (
        <button className="fixed inset-0 z-40 bg-foreground/25 md:hidden" onClick={onClose} aria-label="Close navigation backdrop" />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 md:translate-x-0",
          mobileOpen && "translate-x-0",
          compact && "md:w-[76px]",
        )}
        id="primary-navigation"
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <span className="text-base font-black tracking-tight">{data.instance.brand_mark}</span>
          </div>
          <div className={cn("min-w-0 flex-1", compact && "md:hidden")}>
            <p className="truncate text-sm font-semibold">{data.instance.brand_name}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/75">Private by default</p>
          </div>
          <Button aria-label="Close navigation" className="md:hidden" onClick={onClose} size="icon" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard sections">
          <button
            aria-current={selectedId === START_ID ? "page" : undefined}
            className={cn(
              "group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              selectedId === START_ID && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              compact && "md:justify-center md:px-2",
            )}
            onClick={() => onSelect(START_ID)}
            title={compact ? "Start here" : undefined}
          >
            <Rocket className={cn("size-4 shrink-0 text-sidebar-foreground/55", selectedId === START_ID && "text-sidebar-primary")} />
            <span className={cn("min-w-0 flex-1 truncate", compact && "md:hidden")}>Start here</span>
          </button>
          <p
            className={cn(
              "px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/70",
              compact && "md:hidden",
            )}
          >
            Your system
          </p>
          {data.sources.map(({ definition, snapshot }) => {
            const Icon = Object.hasOwn(domainIcons, definition.domain)
              ? domainIcons[definition.domain as keyof typeof domainIcons]
              : Activity
            const active = definition.id === selectedId
            const status = snapshot ? snapshot.status : "missing"
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  compact && "md:justify-center md:px-2",
                )}
                key={definition.id}
                onClick={() => onSelect(definition.id)}
                title={compact ? `${definition.label}, ${status}` : undefined}
              >
                <Icon className={cn("size-4 shrink-0 text-sidebar-foreground/55", active && "text-sidebar-primary")} />
                <span className={cn("min-w-0 flex-1 truncate", compact && "md:hidden")}>{definition.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    snapshot
                      ? snapshot.status === "success"
                        ? "bg-positive"
                        : snapshot.status === "partial"
                          ? "bg-warning"
                          : "bg-destructive"
                      : "bg-muted-foreground",
                    compact && "md:hidden",
                  )}
                />
                <span className="sr-only">{status}</span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent",
              compact && "md:justify-center md:px-2",
            )}
            onClick={onCompact}
          >
            <span className="hidden md:block">
              {compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </span>
            <ShieldCheck className="size-4 md:hidden" />
            <span className={cn(compact && "md:hidden")}>{compact ? "Expand" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function DashboardPage({
  definition,
  instance,
  snapshot,
}: {
  definition: SourceDefinition
  instance: InstanceConfig
  snapshot: Snapshot | null
}) {
  if (!snapshot)
    return (
      <section>
        <PageEyebrow definition={definition} instance={instance} snapshot={null} />
        <div className="mt-16 rounded-xl border border-dashed border-border p-8 text-center sm:p-12">
          <RefreshCcw className="mx-auto size-7 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Waiting for the first snapshot</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Run the registered prompt and publish one valid file to the worker-owned path. Missing data stays visible, it never becomes a
            suspiciously confident zero.
          </p>
        </div>
      </section>
    )
  return (
    <section>
      <PageEyebrow definition={definition} instance={instance} snapshot={snapshot} />
      <div className="mt-5 flex flex-col justify-between gap-5 border-b border-border pb-7 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-pretty text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{snapshot.data.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{snapshot.data.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              snapshot.status === "success" ? "bg-positive" : snapshot.status === "partial" ? "bg-warning" : "bg-destructive",
            )}
          />
          <span>
            {snapshot.status === "success"
              ? "All expected inputs"
              : snapshot.status === "partial"
                ? "Some evidence limited"
                : "Source unavailable"}
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-50" />
        </div>
      </div>
      {snapshot.quality.warnings.length ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <RefreshCcw className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div>
            <p className="text-sm font-medium">Evidence note</p>
            {snapshot.quality.warnings.map((warning) => (
              <p className="mt-1 text-sm leading-relaxed text-foreground/80" key={warning}>
                {warning}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {snapshot.data.presentation.blocks.map((block) => (
          <BlockRenderer block={block} instance={instance} key={block.id} />
        ))}
      </div>
      <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row">
        <span>Snapshot {snapshot.snapshot_id}</span>
        <span>
          {snapshot.quality.confidence} confidence, {snapshot.sources.length} source{snapshot.sources.length === 1 ? "" : "s"}, expires{" "}
          {formatTimestamp(snapshot.freshness.expires_at, instance)}
        </span>
      </footer>
    </section>
  )
}

function PageEyebrow({
  definition,
  instance,
  snapshot,
}: {
  definition: SourceDefinition
  instance: InstanceConfig
  snapshot: Snapshot | null
}) {
  const date = snapshot
    ? new Intl.DateTimeFormat(instance.locale, { weekday: "long", month: "long", day: "numeric", timeZone: instance.timezone }).format(
        new Date(snapshot.effective_period.start),
      )
    : "No snapshot yet"
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <span>{date}</span>
      <span className="text-border">/</span>
      <span>{definition.domain}</span>
      {snapshot?.privacy.synthetic ? (
        <>
          <span className="text-border">/</span>
          <span className="text-info-foreground">Synthetic</span>
        </>
      ) : null}
    </div>
  )
}

function ThemeMenu({
  density,
  fontFamily,
  headingStyle,
  mode,
  onClose,
  onDensity,
  onFont,
  onHeading,
  onMode,
  onPalette,
  onRadius,
  palette,
  radius,
}: {
  density: Density
  fontFamily: FontFamily
  headingStyle: HeadingStyle
  mode: ThemeMode
  onClose: () => void
  onDensity: (value: Density) => void
  onFont: (value: FontFamily) => void
  onHeading: (value: HeadingStyle) => void
  onMode: (mode: ThemeMode) => void
  onPalette: (palette: string) => void
  onRadius: (radius: string) => void
  palette: string
  radius: string
}) {
  return (
    <div
      aria-label="Theme studio"
      className="absolute right-0 top-11 z-50 max-h-[calc(100vh-5rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl"
      id="theme-studio"
      role="dialog"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Theme studio</p>
        <Button aria-label="Close theme studio" onClick={onClose} size="icon" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Preview freely. Deployment defaults live in your ignored instance configuration.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          onClick={() => onMode("light")}
          size="sm"
          variant={mode === "light" ? "secondary" : "ghost"}
          aria-pressed={mode === "light"}
        >
          <Sun className="size-3.5" />
          Light
        </Button>
        <Button onClick={() => onMode("dark")} size="sm" variant={mode === "dark" ? "secondary" : "ghost"} aria-pressed={mode === "dark"}>
          <Moon className="size-3.5" />
          Dark
        </Button>
      </div>
      <Separator className="my-4" />
      <fieldset>
        <legend className="text-xs font-semibold">Palette</legend>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {["sage", "ocean", "plum", "sand", "custom"].map((item) => (
            <button
              aria-label={`${item} palette`}
              aria-pressed={palette === item}
              className={cn(
                "grid min-h-14 place-items-center rounded-lg border p-2 capitalize",
                palette === item ? "border-primary bg-accent" : "border-border",
              )}
              key={item}
              onClick={() => onPalette(item)}
            >
              <span className={cn("palette-dot", `palette-${item}`)} />
              <span className="mt-1 text-[10px]">{item}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold">
          Font
          <select
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => onFont(event.target.value as FontFamily)}
            value={fontFamily}
          >
            {["system", "humanist", "editorial", "rounded", "mono"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Headers
          <select
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => onHeading(event.target.value as HeadingStyle)}
            value={headingStyle}
          >
            {["plain", "compact", "expressive"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <Separator className="my-4" />
      <fieldset>
        <legend className="text-xs font-semibold">Density</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {["comfortable", "compact"].map((item) => (
            <Button
              aria-pressed={density === item}
              key={item}
              onClick={() => onDensity(item as Density)}
              size="sm"
              variant={density === item ? "secondary" : "ghost"}
            >
              {item}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold">Corner radius</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            ["0.35rem", "Tight"],
            ["0.9rem", "Soft"],
            ["1.25rem", "Round"],
          ].map(([value, label]) => (
            <Button
              aria-pressed={radius === value}
              key={value}
              onClick={() => onRadius(value)}
              size="sm"
              variant={radius === value ? "secondary" : "ghost"}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground" role="status">
      <div className="text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <span className="font-black">Z</span>
        </div>
        <p className="mt-4 text-sm font-medium">Preparing your dashboard</p>
        <p className="mt-1 text-xs text-muted-foreground">Loading the private data index</p>
      </div>
    </div>
  )
}
function InlineLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground" role="status">
      Loading the tutorial
    </div>
  )
}
function LoadError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <RefreshCcw className="mx-auto size-7 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Dashboard data stayed private, perhaps a little too private</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message} Run npm run data:build, then reload.</p>
        <Button className="mt-5" onClick={() => location.reload()}>
          Try again
        </Button>
      </div>
    </main>
  )
}
function EmptyDashboard() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-xl font-semibold">No sources enabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enable a registered source in your instance configuration.</p>
      </div>
    </div>
  )
}
function formatTimestamp(value: string, instance: InstanceConfig) {
  return new Intl.DateTimeFormat(instance.locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: instance.timezone,
  }).format(new Date(value))
}
