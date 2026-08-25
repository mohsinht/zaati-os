import { useId, useState } from "react"
import type { BarChartBlock, DonutChartBlock, InstanceConfig, LineChartBlock, ValueFormat } from "@/types"

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const dashPatterns = [undefined, "9 5", "2 5", "12 4 2 4", "5 4"]
const width = 640
const height = 260
const plot = { left: 58, right: 18, top: 18, bottom: 48 }

function format(value: number, kind: ValueFormat, instance: InstanceConfig) {
  if (kind === "currency")
    return new Intl.NumberFormat(instance.locale, { style: "currency", currency: instance.currency, maximumFractionDigits: 0 }).format(
      value,
    )
  if (kind === "percent") return `${new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 1 }).format(value)}%`
  if (kind === "compact-number")
    return new Intl.NumberFormat(instance.locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
  return new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 2 }).format(value)
}

function domain(values: number[]) {
  let min = Math.min(...values, 0)
  let max = Math.max(...values, 0)
  if (min === max) {
    min -= 1
    max += 1
  }
  const padding = (max - min) * 0.08
  return { min: min - padding, max: max + padding }
}

function yPosition(value: number, min: number, max: number) {
  const available = height - plot.top - plot.bottom
  return plot.top + ((max - value) / (max - min)) * available
}

function ChartTooltip({ x, y, title, value }: { x: number; y: number; title: string; value: string }) {
  const tooltipWidth = Math.min(220, Math.max(112, Math.max(title.length, value.length) * 7 + 24))
  const tooltipX = Math.max(4, Math.min(width - tooltipWidth - 4, x - tooltipWidth / 2))
  const tooltipY = y < 76 ? y + 18 : y - 58
  return (
    <g aria-hidden="true" className="chart-tooltip" pointerEvents="none" transform={`translate(${tooltipX} ${tooltipY})`}>
      <rect fill="var(--popover)" height="44" rx="8" stroke="var(--border)" width={tooltipWidth} />
      <text fill="var(--muted-foreground)" fontSize="10" x="11" y="17">
        {title.length > 28 ? `${title.slice(0, 27)}…` : title}
      </text>
      <text fill="var(--popover-foreground)" fontSize="12" fontWeight="600" x="11" y="34">
        {value}
      </text>
    </g>
  )
}

export default function ChartVisual({
  block,
  instance,
}: {
  block: LineChartBlock | BarChartBlock | DonutChartBlock
  instance: InstanceConfig
}) {
  const descriptionId = useId()
  if (block.kind === "line-chart") return <LineVisual block={block} descriptionId={descriptionId} instance={instance} />
  if (block.kind === "bar-chart") return <BarVisual block={block} descriptionId={descriptionId} instance={instance} />
  return <DonutVisual block={block} descriptionId={descriptionId} instance={instance} />
}

function DonutVisual({ block, descriptionId, instance }: { block: DonutChartBlock; descriptionId: string; instance: InstanceConfig }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const valueFormat = block.value_format || "number"
  const total = block.segments.reduce((sum, segment) => sum + segment.value, 0)
  const radius = 76
  const circumference = 2 * Math.PI * radius
  const arcs = block.segments.map((segment, index) => ({
    ...segment,
    length: (segment.value / total) * circumference,
    offset: (block.segments.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) / total) * circumference,
  }))
  return (
    <figure aria-labelledby={descriptionId} className="m-0 grid gap-5 sm:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)] sm:items-center">
      <figcaption className="sr-only" id={descriptionId}>
        {block.title} allocation chart. Exact values follow in a list.
      </figcaption>
      <div className="relative mx-auto aspect-square w-full max-w-[230px]">
        <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" fill="none" r={radius} stroke="var(--muted)" strokeWidth="24" />
          {arcs.map((segment, index) => {
            return (
              <circle
                className="chart-donut-segment"
                cx="100"
                cy="100"
                fill="none"
                key={segment.label}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerLeave={() => setActiveIndex(null)}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.38}
                r={radius}
                stroke={colors[index % colors.length]}
                strokeDasharray={`${Math.max(0, segment.length - 2)} ${circumference}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
                strokeWidth={activeIndex === index ? 30 : 24}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span aria-live="polite" className="text-xl font-semibold tracking-tight">
            {format(activeIndex === null ? total : block.segments[activeIndex].value, valueFormat, instance)}
          </span>
          <span className="mt-1 max-w-28 truncate text-xs text-muted-foreground">
            {activeIndex === null ? block.center_label : block.segments[activeIndex].label}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-border" aria-label={`${block.title} values`}>
        {block.segments.map((segment, index) => (
          <li key={segment.label}>
            <button
              aria-pressed={activeIndex === index}
              className="group flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
              onBlur={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full transition-transform group-hover:scale-125 group-focus-visible:scale-125"
                  style={{ background: colors[index % colors.length] }}
                />
                <span className="truncate">{segment.label}</span>
              </span>
              <span className="shrink-0 text-sm font-medium">{format(segment.value, valueFormat, instance)}</span>
            </button>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function LineVisual({ block, descriptionId, instance }: { block: LineChartBlock; descriptionId: string; instance: InstanceConfig }) {
  const [activePoint, setActivePoint] = useState<{ pointIndex: number; seriesIndex: number } | null>(null)
  const valueFormat = block.y_format || "number"
  const values = block.points.flatMap((point) =>
    block.series.map((series) => point.values[series.key]).filter((value): value is number => Number.isFinite(value)),
  )
  const range = domain(values)
  const x = (index: number) => plot.left + (index / Math.max(1, block.points.length - 1)) * (width - plot.left - plot.right)
  const ticks = Array.from({ length: 5 }, (_, index) => range.min + ((range.max - range.min) * index) / 4).reverse()
  return (
    <figure aria-labelledby={descriptionId} className="m-0 w-full">
      <figcaption className="sr-only" id={descriptionId}>
        {block.title} line chart. Exact values follow in an accessible table.
      </figcaption>
      <svg
        aria-label={`${block.title} interactive line chart`}
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((tick) => {
          const y = yPosition(tick, range.min, range.max)
          return (
            <g key={tick}>
              <line stroke="var(--border)" strokeDasharray="3 4" x1={plot.left} x2={width - plot.right} y1={y} y2={y} />
              <text fill="var(--muted-foreground)" fontSize="11" textAnchor="end" x={plot.left - 9} y={y + 4}>
                {format(tick, valueFormat, instance)}
              </text>
            </g>
          )
        })}
        <g className="chart-series-reveal">
          {block.series.map((series, seriesIndex) => {
            const points = block.points
              .map((point, index) => `${x(index)},${yPosition(point.values[series.key], range.min, range.max)}`)
              .join(" ")
            return (
              <polyline
                className="transition-opacity duration-200"
                fill="none"
                key={series.key}
                opacity={activePoint === null || activePoint.seriesIndex === seriesIndex ? 1 : 0.3}
                points={points}
                stroke={colors[seriesIndex % colors.length]}
                strokeDasharray={dashPatterns[seriesIndex % dashPatterns.length]}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            )
          })}
        </g>
        {block.series.flatMap((series, seriesIndex) =>
          block.points.map((point, pointIndex) => {
            const pointX = x(pointIndex)
            const pointY = yPosition(point.values[series.key], range.min, range.max)
            const active = activePoint?.pointIndex === pointIndex && activePoint.seriesIndex === seriesIndex
            const label = `${series.label}, ${point.x}: ${format(point.values[series.key], valueFormat, instance)}`
            return (
              <g
                aria-label={label}
                className="chart-data-target"
                key={`${series.key}-${point.x}`}
                onBlur={() => setActivePoint(null)}
                onFocus={() => setActivePoint({ pointIndex, seriesIndex })}
                onPointerEnter={() => setActivePoint({ pointIndex, seriesIndex })}
                onPointerLeave={() => setActivePoint(null)}
                role="img"
                tabIndex={0}
              >
                <circle cx={pointX} cy={pointY} fill="transparent" r="12" />
                <circle
                  className="chart-point"
                  cx={pointX}
                  cy={pointY}
                  fill="var(--card)"
                  r={active ? 6 : seriesIndex % 2 === 0 ? 3.5 : 2.5}
                  stroke={colors[seriesIndex % colors.length]}
                  strokeWidth={active ? 3 : 2}
                />
              </g>
            )
          }),
        )}
        {activePoint
          ? (() => {
              const series = block.series[activePoint.seriesIndex]
              const point = block.points[activePoint.pointIndex]
              const pointX = x(activePoint.pointIndex)
              const pointY = yPosition(point.values[series.key], range.min, range.max)
              return (
                <>
                  <line className="chart-guide" x1={pointX} x2={pointX} y1={plot.top} y2={height - plot.bottom} />
                  <ChartTooltip
                    title={`${series.label} · ${point.x}`}
                    value={format(point.values[series.key], valueFormat, instance)}
                    x={pointX}
                    y={pointY}
                  />
                </>
              )
            })()
          : null}
        {block.points.map((point, index) =>
          index === 0 || index === block.points.length - 1 || block.points.length <= 8 ? (
            <text
              fill="var(--muted-foreground)"
              fontSize="11"
              key={point.x}
              textAnchor={index === 0 ? "start" : index === block.points.length - 1 ? "end" : "middle"}
              x={x(index)}
              y={height - 18}
            >
              {point.x}
            </text>
          ) : null,
        )}
      </svg>
      <div aria-hidden="true" className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {block.series.map((series, index) => (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" key={series.key}>
            <svg aria-hidden="true" className="h-2 w-5" viewBox="0 0 20 8">
              <line
                stroke={colors[index % colors.length]}
                strokeDasharray={dashPatterns[index % dashPatterns.length]}
                strokeWidth="2"
                x1="0"
                x2="20"
                y1="4"
                y2="4"
              />
            </svg>
            {series.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{block.title}</caption>
        <thead>
          <tr>
            <th>{block.x_label || "Period"}</th>
            {block.series.map((series) => (
              <th key={series.key}>{series.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.points.map((point) => (
            <tr key={point.x}>
              <th>{point.x}</th>
              {block.series.map((series) => (
                <td key={series.key}>{format(point.values[series.key], valueFormat, instance)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function BarVisual({ block, descriptionId, instance }: { block: BarChartBlock; descriptionId: string; instance: InstanceConfig }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const valueFormat = block.value_format || "number"
  const range = domain(block.bars.map((bar) => bar.value))
  const available = width - plot.left - plot.right
  const slot = available / block.bars.length
  const barWidth = Math.min(44, slot * 0.66)
  const baseline = yPosition(0, range.min, range.max)
  const ticks = Array.from({ length: 5 }, (_, index) => range.min + ((range.max - range.min) * index) / 4).reverse()
  const labelEvery = Math.max(1, Math.ceil(block.bars.length / 8))
  return (
    <figure aria-labelledby={descriptionId} className="m-0 w-full">
      <figcaption className="sr-only" id={descriptionId}>
        {block.title} bar chart. Exact values follow in an accessible table.
      </figcaption>
      <svg
        aria-label={`${block.title} interactive bar chart`}
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((tick) => {
          const y = yPosition(tick, range.min, range.max)
          return (
            <g key={tick}>
              <line stroke="var(--border)" strokeDasharray="3 4" x1={plot.left} x2={width - plot.right} y1={y} y2={y} />
              <text fill="var(--muted-foreground)" fontSize="11" textAnchor="end" x={plot.left - 9} y={y + 4}>
                {format(tick, valueFormat, instance)}
              </text>
            </g>
          )
        })}
        {block.bars.map((bar, index) => {
          const valueY = yPosition(bar.value, range.min, range.max)
          const x = plot.left + index * slot + (slot - barWidth) / 2
          const y = Math.min(valueY, baseline)
          const barHeight = Math.max(1, Math.abs(baseline - valueY))
          return (
            <g
              aria-label={`${bar.label}: ${format(bar.value, valueFormat, instance)}`}
              className="chart-data-target"
              key={bar.label}
              onBlur={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              role="img"
              tabIndex={0}
            >
              <rect fill="transparent" height={height - plot.top - plot.bottom} width={slot} x={plot.left + index * slot} y={plot.top} />
              <rect
                className="chart-bar"
                fill={colors[index % colors.length]}
                height={barHeight}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.32}
                rx="4"
                width={barWidth}
                x={x}
                y={y}
              />
              {index % labelEvery === 0 ? (
                <text fill="var(--muted-foreground)" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y={height - 18}>
                  {bar.label.length > 12 ? `${bar.label.slice(0, 11)}…` : bar.label}
                </text>
              ) : null}
            </g>
          )
        })}
        {activeIndex !== null
          ? (() => {
              const bar = block.bars[activeIndex]
              const valueY = yPosition(bar.value, range.min, range.max)
              const pointX = plot.left + activeIndex * slot + slot / 2
              return <ChartTooltip title={bar.label} value={format(bar.value, valueFormat, instance)} x={pointX} y={valueY} />
            })()
          : null}
      </svg>
      <table className="sr-only">
        <caption>{block.title}</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {block.bars.map((bar) => (
            <tr key={bar.label}>
              <th>{bar.label}</th>
              <td>{format(bar.value, valueFormat, instance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
