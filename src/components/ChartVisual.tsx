import { useId } from "react"
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
                cx="100"
                cy="100"
                fill="none"
                key={segment.label}
                r={radius}
                stroke={colors[index % colors.length]}
                strokeDasharray={`${Math.max(0, segment.length - 2)} ${circumference}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
                strokeWidth="24"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-xl font-semibold tracking-tight">{format(total, valueFormat, instance)}</span>
          {block.center_label ? <span className="mt-1 text-xs text-muted-foreground">{block.center_label}</span> : null}
        </div>
      </div>
      <ul className="divide-y divide-border" aria-label={`${block.title} values`}>
        {block.segments.map((segment, index) => (
          <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0" key={segment.label}>
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 text-sm font-medium">{format(segment.value, valueFormat, instance)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function LineVisual({ block, descriptionId, instance }: { block: LineChartBlock; descriptionId: string; instance: InstanceConfig }) {
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
        aria-hidden="true"
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
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
        {block.series.map((series, seriesIndex) => {
          const points = block.points
            .map((point, index) => `${x(index)},${yPosition(point.values[series.key], range.min, range.max)}`)
            .join(" ")
          return (
            <polyline
              fill="none"
              key={series.key}
              points={points}
              stroke={colors[seriesIndex % colors.length]}
              strokeDasharray={dashPatterns[seriesIndex % dashPatterns.length]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          )
        })}
        {block.series.flatMap((series, seriesIndex) =>
          block.points.map((point, pointIndex) => (
            <circle
              cx={x(pointIndex)}
              cy={yPosition(point.values[series.key], range.min, range.max)}
              fill="var(--card)"
              key={`${series.key}-${point.x}`}
              r={seriesIndex % 2 === 0 ? 3.5 : 2.5}
              stroke={colors[seriesIndex % colors.length]}
              strokeWidth="2"
            />
          )),
        )}
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
        aria-hidden="true"
        className="h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
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
            <g key={bar.label}>
              <rect fill={colors[index % colors.length]} height={barHeight} rx="4" width={barWidth} x={x} y={y}>
                <title>{`${bar.label}: ${format(bar.value, valueFormat, instance)}`}</title>
              </rect>
              {index % labelEvery === 0 ? (
                <text fill="var(--muted-foreground)" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y={height - 18}>
                  {bar.label.length > 12 ? `${bar.label.slice(0, 11)}…` : bar.label}
                </text>
              ) : null}
            </g>
          )
        })}
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
