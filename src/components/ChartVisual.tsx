import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { BarChartBlock, InstanceConfig, LineChartBlock, ValueFormat } from "@/types"

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
function format(value: number, kind: ValueFormat, instance: InstanceConfig) {
  if (kind === "currency") return new Intl.NumberFormat(instance.locale, { style: "currency", currency: instance.currency, maximumFractionDigits: 0 }).format(value)
  if (kind === "percent") return `${new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 1 }).format(value)}%`
  if (kind === "compact-number") return new Intl.NumberFormat(instance.locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
  return new Intl.NumberFormat(instance.locale, { maximumFractionDigits: 2 }).format(value)
}
export default function ChartVisual({ block, instance }: { block: LineChartBlock | BarChartBlock; instance: InstanceConfig }) {
  const valueFormat = block.kind === "line-chart" ? block.y_format || "number" : block.value_format || "number"
  if (block.kind === "line-chart") {
    const rows = block.points.map((point) => ({ x: point.x, ...point.values }))
    return <div className="h-64 w-full" role="img" aria-label={`${block.title} line chart`}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(value) => format(value, valueFormat, instance)} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--popover-foreground)", fontSize: 12 }} formatter={(value) => format(typeof value === "number" ? value : Number(value ?? 0), valueFormat, instance)} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />{block.series.map((series, index) => <Line key={series.key} dataKey={series.key} name={series.label} stroke={chartColors[index]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} type="monotone" />)}</LineChart></ResponsiveContainer></div>
  }
  return <div className="h-64 w-full" role="img" aria-label={`${block.title} bar chart`}><ResponsiveContainer width="100%" height="100%"><BarChart data={block.bars} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(value) => format(value, valueFormat, instance)} /><Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--popover-foreground)", fontSize: 12 }} formatter={(value) => format(typeof value === "number" ? value : Number(value ?? 0), valueFormat, instance)} /><Bar dataKey="value" radius={[5, 5, 0, 0]}>{block.bars.map((entry, index) => <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
}
