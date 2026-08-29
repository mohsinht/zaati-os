import { lazy, Suspense } from "react"
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Info, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { DashboardBlock, InstanceConfig, Span, Tone, ValueFormat } from "@/types"

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
const spanClass: Record<Span, string> = { one: "lg:col-span-1", two: "lg:col-span-2", full: "lg:col-span-3" }
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
  if (format === "percent") return `${new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 1 }).format(value)}%`
  if (format === "compact-number")
    return new Intl.NumberFormat(instance.locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
  return new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 2 }).format(value)
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
      <Panel block={block} className="bg-card/80" emphasized={emphasized} layout={layout}>
        <div
          className={cn(
            "grid gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-2",
            block.metrics.length === 3 && "xl:grid-cols-3",
            block.metrics.length === 4 && "xl:grid-cols-4",
            block.metrics.length === 5 && "xl:grid-cols-5",
            block.metrics.length === 6 && "xl:grid-cols-3",
          )}
        >
          {block.metrics.map((metric) => (
            <div className="group min-w-0 bg-card px-4 py-3 transition-colors hover:bg-accent/45" key={metric.label}>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", toneDot[metric.tone || "neutral"])} />
                {metric.label}
              </div>
              <div className="flex items-end gap-2">
                <span className="truncate text-2xl font-semibold tracking-tight transition-transform duration-200 group-hover:translate-x-0.5">
                  {formatValue(metric.value, metric.format, instance)}
                  {metric.unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{metric.unit}</span> : null}
                </span>
              </div>
              {metric.change !== undefined ? (
                <p className={cn("mt-1 text-xs", metric.change >= 0 ? "text-positive-foreground" : "text-destructive")}>
                  <span>
                    {metric.change > 0 ? "+" : ""}
                    {formatValue(metric.change, metric.format === "percent" ? "percent" : "number", instance)}
                  </span>
                  {metric.change_label ? <span className="ml-1 text-muted-foreground">{metric.change_label}</span> : null}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
    )
  }

  if (block.kind === "list") {
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        {block.items.length ? (
          <div className="divide-y divide-border">
            {block.items.map((item) => {
              const content = (
                <>
                  <span aria-hidden="true" className={cn("mt-2 size-1.5 shrink-0 rounded-full", toneDot[item.tone || "neutral"])} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-medium leading-6">{item.title}</span>
                      {item.status ? <Badge variant={toneBadge[item.tone || "neutral"]}>{item.status}</Badge> : null}
                    </span>
                    {item.description ? (
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
                    ) : null}
                    {item.meta ? <span className="mt-2 block text-xs font-medium text-muted-foreground">{item.meta}</span> : null}
                  </span>
                  {item.href ? <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
                </>
              )
              return item.href ? (
                <a
                  className="group flex gap-3 rounded-lg px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/55 hover:text-primary focus-visible:bg-muted/55"
                  href={item.href}
                  key={item.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <div
                  className="group flex gap-3 rounded-lg px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/45"
                  key={item.id}
                >
                  {content}
                </div>
              )
            })}
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
                <div className="w-16 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">{time(event.start)}</div>
                <span className={cn("mt-1.5 h-8 w-0.5 rounded-full", toneDot[event.tone || "neutral"])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5">{event.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {event.end ? `${time(event.start)} to ${time(event.end)}` : time(event.start)}
                    {event.location ? `, ${event.location}` : ""}
                  </p>
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
    return (
      <Panel block={block} emphasized={emphasized} layout={layout}>
        {block.rows.length ? (
          <div
            aria-label={`${block.title} table`}
            className="overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <caption className="sr-only">{block.title}</caption>
              <thead className="bg-muted/70 text-xs text-foreground">
                <tr>
                  {block.columns.map((column) => (
                    <th className="px-3 py-2.5 font-medium" key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {block.rows.map((row, index) => (
                  <tr className="transition-colors hover:bg-muted/55" key={index}>
                    {block.columns.map((column) => (
                      <td className="max-w-64 px-3 py-3 align-top" key={column.key}>
                        {formatValue(row[column.key] ?? null, column.format, instance)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
