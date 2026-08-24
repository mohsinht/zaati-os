import { useId } from "react"
import type { BarChartBlock, InstanceConfig, LineChartBlock, ValueFormat } from "@/types"

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
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

export default function ChartVisual({ block, instance }: { block: LineChartBlock | BarChartBlock; instance: InstanceConfig }) {
  const descriptionId = useId()
  return block.kind === "line-chart" ? (
    <LineVisual block={block} descriptionId={descriptionId} instance={instance} />
  ) : (
    <BarVisual block={block} descriptionId={descriptionId} instance={instance} />
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
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          )
        })}
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
            <span className="size-2 rounded-full" style={{ background: colors[index % colors.length] }} />
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
              <rect fill={colors[index % colors.length]} height={barHeight} rx="4" width={barWidth} x={x} y={y} />
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
