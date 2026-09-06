import { lazy, Suspense, useState } from "react"
import { ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown, Info, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DashboardBlock, InstanceConfig, ListBlock, MetricGroupBlock, Span, TableBlock, Tone, ValueFormat } from "@/types"

const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
}
const toneBadge: Record<Tone, "outline" | "positive" | "warning" | "danger" | "info"> = {
  neutral: "outline",
  positive: "positive",
  warning: "warning",
  danger: "danger",
  info: "info",
}
const spanClass: Record<Span, string> = { one: "xl:col-span-1", two: "xl:col-span-2", full: "xl:col-span-3" }
const ChartVisual = lazy(() => import("@/components/ChartVisual"))
type Layout = "dashboard" | "focus" | "timeline"

function layoutSpan(block: DashboardBlock, layout: Layout, emphasized = false) {
  if (layout === "timeline") return "lg:col-span-1"
  if (layout === "focus") return emphasized || block.span === "full" ? "lg:col-span-2" : "lg:col-span-1"
  return spanClass[block.span || "one"]
}

function formatValue(value: string | number | boolean | null, format: ValueFormat = "text", instance: InstanceConfig) {
  if (value === null) return "Not available"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "string") {
    if (format === "date")
      return new Intl.DateTimeFormat(instance.locale, { dateStyle: "medium", timeZone: instance.timezone }).format(new Date(value))
    if (format === "time")
      return new Intl.DateTimeFormat(instance.locale, { timeStyle: "short", timeZone: instance.timezone }).format(new Date(value))
    return value
  }
  if (format === "currency")
    return new Intl.NumberFormat(instance.locale, { style: "currency", currency: instance.currency, maximumFractionDigits: 0 }).format(
      value,
    )
  if (format === "percent") {
    const rounded = Math.round(value * 10) / 10
    return `${new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 1 }).format(Object.is(rounded, -0) ? 0 : rounded)}%`
  }
  if (format === "compact-number")
    return new Intl.NumberFormat(instance.locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
  return new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 2 }).format(value)
}

function ListRows({ items }: { items: ListBlock["items"] }) {
  return items.map((item) => {
    const content = (
      <>
        <span aria-hidden="true" className={cn("mt-2 size-1.5 shrink-0 rounded-full", toneDot[item.tone || "neutral"])} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="font-medium leading-6">{item.title}</span>
            {item.status ? <Badge variant={toneBadge[item.tone || "neutral"]}>{item.status}</Badge> : null}
          </span>
          {item.description ? <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.description}</span> : null}
          {item.meta ? <span className="mt-2 block text-xs font-medium text-muted-foreground">{item.meta}</span> : null}
        </span>
        {item.href ? <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
      </>
    )
    return item.href ? (
      <a
        className="group flex gap-3 rounded-none px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/55 hover:text-primary focus-visible:bg-muted/55"
        href={item.href}
        key={item.id}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    ) : (
      <div className="group flex gap-3 rounded-none px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/45" key={item.id}>
        {content}
      </div>
    )
  })
}

function MetricTrend({ metric, instance }: { metric: MetricGroupBlock["metrics"][number]; instance: InstanceConfig }) {
  if (!metric.trend) return null
  const { points, label } = metric.trend
  const values = points.map((p) => p.value)
  const min = Math.min(...values),
    max = Math.max(...values)
  const coordinates = points
    .map((p, i) => `${(i / (points.length - 1)) * 240},${max === min ? 24 : 42 - ((p.value - min) / (max - min)) * 36}`)
    .join(" ")
  const color = metric.tone === "danger" ? "var(--destructive)" : metric.tone === "positive" ? "var(--positive)" : "var(--chart-1)"
  return (
    <div className="mt-3">
      <svg
        aria-label={`${metric.label}: ${label}`}
        role="img"
        viewBox="0 0 240 48"
        className="h-12 w-full"
        preserveAspectRatio="none"
        style={{ color }}
      >
        <polygon points={`0,48 ${coordinates} 240,48`} fill="currentColor" opacity=".08" />
        <polyline
          className="chart-series-reveal"
          points={coordinates}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="min-h-8 cursor-pointer py-1" aria-label={`${metric.label} trend values`}>
          {label}
        </summary>
        <dl className="mt-2 max-h-36 overflow-y-auto divide-y divide-border">
          {points.map((point, i) => (
            <div className="flex justify-between gap-2 py-1" key={i}>
              <dt>{point.label}</dt>
              <dd className="tabular-nums text-foreground">{formatValue(point.value, metric.format, instance)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}

function DataTable({
  block,
  instance,
  rows,
  suffix = "",
}: {
  block: TableBlock
  instance: InstanceConfig
  rows: TableBlock["rows"]
  suffix?: string
}) {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; descending: boolean } | null>(null)
  const [page, setPage] = useState(0)
  const matched = rows.filter(
    (row) =>
      block.columns.some((col) =>
        String(row[col.key] ?? "")
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ) && Object.entries(filters).every(([key, value]) => !value || String(row[key]) === value),
  )
  if (sort)
    matched.sort(
      (a, b) =>
        (typeof a[sort.key] === "number" && typeof b[sort.key] === "number"
          ? Number(a[sort.key]) - Number(b[sort.key])
          : String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), instance.locale, { numeric: true })) *
        (sort.descending ? -1 : 1),
    )
  const pages = Math.max(1, Math.ceil(matched.length / 10))
  const currentPage = Math.min(page, pages - 1)
  const visible = block.searchable ? matched.slice(currentPage * 10, currentPage * 10 + 10) : rows
  return (
    <>
      {block.searchable ? (
        <div className="mb-4 flex flex-wrap items-end gap-2" role="search" aria-label={`${block.title} filters`}>
          <label className="min-w-40 flex-1 text-xs text-muted-foreground">
            Search
            <Input
              className="mt-1"
              placeholder="Search items…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
            />
          </label>
          {block.columns
            .filter((col) => col.filterable)
            .map((col) => (
              <label className="text-xs text-muted-foreground" key={col.key}>
                {col.label}
                <select
                  className="mt-1 block h-10 max-w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={filters[col.key] || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, [col.key]: e.target.value })
                    setPage(0)
                  }}
                >
                  <option value="">All</option>
                  {[...new Set(rows.map((row) => String(row[col.key] ?? "")))]
                    .filter(Boolean)
                    .sort()
                    .map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                </select>
              </label>
            ))}
          {query || Object.values(filters).some(Boolean) ? (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("")
                setFilters({})
                setPage(0)
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}
      <div
        aria-label={`${block.title}${suffix} table`}
        className="overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <caption className="sr-only">
            {block.title}
            {suffix}
          </caption>
          <thead className="bg-muted/70 text-xs text-foreground">
            <tr>
              {block.columns.map((col) => (
                <th
                  className="px-3 py-2.5 font-medium"
                  key={col.key}
                  aria-sort={sort?.key === col.key ? (sort.descending ? "descending" : "ascending") : undefined}
                >
                  {block.searchable ? (
                    <button
                      className="min-h-8 text-left"
                      onClick={() => {
                        setSort({ key: col.key, descending: sort?.key === col.key && !sort.descending })
                        setPage(0)
                      }}
                    >
                      {col.label}{" "}
                      <span aria-hidden="true" className="ml-1 text-muted-foreground">
                        {sort?.key === col.key ? (sort.descending ? "↓" : "↑") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row, index) => (
              <tr className="transition-colors hover:bg-muted/55" key={index}>
                {block.columns.map((col) => (
                  <td className="max-w-64 break-words px-3 py-3 align-top tabular-nums" key={col.key}>
                    {col.tones && Object.hasOwn(col.tones, String(row[col.key])) ? (
                      <Badge variant={toneBadge[col.tones[String(row[col.key])]]}>
                        {formatValue(row[col.key] ?? null, col.format, instance)}
                      </Badge>
                    ) : (
                      formatValue(row[col.key] ?? null, col.format, instance)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!visible.length ? (
              <tr>
                <td colSpan={block.columns.length} className="p-8 text-center text-muted-foreground">
                  No matching items. Clear the filters to see all items.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {block.searchable ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span role="status">
            {matched.length} of {rows.length} items
          </span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
              <span>
                {currentPage + 1} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function Panel({
  block,
  children,
  className,
  emphasized,
  layout,
}: {
  block: DashboardBlock
  children: React.ReactNode
  className?: string
  emphasized: boolean
  layout: Layout
}) {
  return (
    <Card
      data-kind={block.kind}
      className={cn(
        "zaati-block min-w-0 overflow-hidden",
        layoutSpan(block, layout, emphasized),
        emphasized && "border-primary/35",
        className,
      )}
    >
      <CardHeader>
        <CardTitle>{block.title}</CardTitle>
        {"description" in block && block.description ? <CardDescription>{block.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function BlockRenderer({
  block,
  emphasized = false,
  instance,
  layout = "dashboard",
}: {
  block: DashboardBlock
  emphasized?: boolean
  instance: InstanceConfig
  layout?: Layout
}) {
  if (block.kind === "metric-group") {
    return (
      <Panel block={block} className="metric-panel" emphasized={emphasized} layout={layout}>
        <div className="metric-strip">
          {block.metrics.map((metric) => (
            <div className="metric-tile min-w-0 px-5 py-5" data-tone={metric.tone || "neutral"} key={metric.label}>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">{metric.label}</div>
              <div className="flex min-w-0 items-end gap-2">
                <span className="metric-value min-w-0 break-words text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-tight tracking-tight tabular-nums">
                  {formatValue(metric.value, metric.format, instance)}
                  {metric.unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{metric.unit}</span> : null}
                </span>
              </div>
              {metric.change !== undefined ? (
                <p className="mt-1 text-xs text-foreground">
                  <span>
                    {metric.change > 0 ? "+" : ""}
                    {formatValue(metric.change, metric.format || "number", instance)}
                  </span>
                  {metric.change_label ? <span className="ml-1 text-muted-foreground">{metric.change_label}</span> : null}
                </p>
              ) : null}
              <MetricTrend metric={metric} instance={instance} />
            </div>
          ))}
        </div>
      </Panel>
    )
  }

  if (block.kind === "list") {
    const visibleItems = block.items.slice(0, 8)
    const remainingItems = block.items.slice(8)
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        {block.items.length ? (
          <div>
            <div className="divide-y divide-border">
              <ListRows items={visibleItems} />
            </div>
            {remainingItems.length ? (
              <details className="group/more mt-2 border-t border-border pt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Show {remainingItems.length} more
                  <ChevronDown className="size-3.5 transition-transform group-open/more:rotate-180" />
                </summary>
                <div className="mt-1 divide-y divide-border">
                  <ListRows items={remainingItems} />
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <EmptyState label="Nothing needs attention here." />
        )}
      </Panel>
    )
  }

  if (block.kind === "line-chart") {
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        <Suspense fallback={<ChartLoading />}>
          <ChartVisual block={block} instance={instance} />
        </Suspense>
      </Panel>
    )
  }

  if (block.kind === "bar-chart" || block.kind === "donut-chart") {
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        <Suspense fallback={<ChartLoading />}>
          <ChartVisual block={block} instance={instance} />
        </Suspense>
      </Panel>
    )
  }

  if (block.kind === "calendar") {
    const time = (value: string) =>
      new Intl.DateTimeFormat(instance.locale, { hour: "numeric", minute: "2-digit", timeZone: instance.timezone }).format(new Date(value))
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs font-medium text-foreground">
          <CalendarDays className="size-4" />
          {new Intl.DateTimeFormat(instance.locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
            new Date(`${block.date}T12:00:00Z`),
          )}
        </div>
        {block.events.length ? (
          <div className="space-y-1">
            {block.events.map((event) => (
              <div
                className="group flex gap-3 rounded-lg px-2 py-2.5 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-muted/60"
                key={event.id}
              >
                <div className="w-16 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                  {event.all_day ? "All day" : time(event.start)}
                </div>
                <span className={cn("mt-1.5 h-8 w-0.5 rounded-full", toneDot[event.tone || "neutral"])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5">{event.title}</p>
                  {(!event.all_day && event.end) || event.location ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {!event.all_day && event.end ? `Until ${time(event.end)}` : ""}
                      {!event.all_day && event.end && event.location ? " · " : ""}
                      {event.location || ""}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No timed events." />
        )}
      </Panel>
    )
  }

  if (block.kind === "table") {
    if (block.searchable)
      return (
        <Panel block={block} emphasized={emphasized} layout={layout}>
          <DataTable block={block} instance={instance} rows={block.rows} />
        </Panel>
      )
    const visibleRows = block.rows.slice(0, 10)
    const remainingRows = block.rows.slice(10)
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        {block.rows.length ? (
          <div>
            <DataTable block={block} instance={instance} rows={visibleRows} />
            {remainingRows.length ? (
              <details className="group/more mt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Show {remainingRows.length} more rows
                  <ChevronDown className="size-3.5 transition-transform group-open/more:rotate-180" />
                </summary>
                <div className="mt-2">
                  <DataTable block={block} instance={instance} rows={remainingRows} suffix=" continuation" />
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <EmptyState label="No rows to show." />
        )}
      </Panel>
    )
  }

  if (block.kind === "progress") {
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        <div className="space-y-5">
          {block.items.map((item) => {
            const percent = (item.value / item.max) * 100
            return (
              <div className="group rounded-lg px-1 py-1 transition-colors hover:bg-muted/45" key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs font-medium text-muted-foreground">{item.value_label || `${Math.round(percent)}%`}</span>
                </div>
                <Progress
                  indicatorClassName={cn(
                    item.tone === "warning" && "bg-warning",
                    item.tone === "danger" && "bg-destructive",
                    item.tone === "info" && "bg-info",
                    item.tone === "positive" && "bg-positive",
                  )}
                  label={item.label}
                  value={percent}
                />
              </div>
            )
          })}
        </div>
      </Panel>
    )
  }

  if (block.kind === "notice") {
    const Icon = block.tone === "warning" || block.tone === "danger" ? TriangleAlert : block.tone === "positive" ? CheckCircle2 : Info
    return (
      <div
        className={cn(
          "zaati-block rounded-xl border p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          layoutSpan(block, layout, emphasized),
          block.tone === "warning" && "border-warning/30 bg-warning/10",
          block.tone === "danger" && "border-destructive/30 bg-destructive/10",
          block.tone === "positive" && "border-positive/25 bg-positive/10",
          (block.tone === "neutral" || block.tone === "info") && "border-info/25 bg-info/10",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-background p-2 shadow-sm">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{block.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{block.body}</p>
            {block.action ? (
              <a
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                href={block.action.href}
                rel="noreferrer"
                target="_blank"
              >
                {block.action.label}
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (block.kind === "timeline") {
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        {block.items.length ? (
          <div>
            {block.items.map((item, index) => (
              <div
                className="group relative flex gap-4 rounded-lg pb-5 transition-colors hover:bg-muted/35 last:pb-0"
                key={`${item.label}-${item.title}`}
              >
                <div className="flex w-3 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "mt-1.5 size-2.5 rounded-full ring-4 ring-background transition-transform duration-200 group-hover:scale-125",
                      toneDot[item.tone || "neutral"],
                    )}
                  />
                  {index < block.items.length - 1 ? <span className="mt-1 h-full w-px bg-border" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No events in this sequence." />
        )}
      </Panel>
    )
  }

  return (
    <Panel block={block} emphasized={emphasized} layout={layout}>
      <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{block.body}</p>
    </Panel>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{label}</div>
}
function ChartLoading() {
  return <div className="h-64 animate-pulse rounded-lg bg-muted" aria-label="Loading chart" role="status" />
}
