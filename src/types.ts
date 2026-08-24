export type Tone = "neutral" | "positive" | "warning" | "danger" | "info"
export type Span = "one" | "two" | "full"
export type ValueFormat = "text" | "number" | "compact-number" | "currency" | "percent" | "date" | "time" | "duration"

type BlockBase = { id: string; title: string; description?: string; span?: Span }
export type MetricGroupBlock = BlockBase & {
  kind: "metric-group"
  metrics: Array<{
    label: string
    value: string | number
    format?: ValueFormat
    unit?: string
    change?: number
    change_label?: string
    tone?: Tone
  }>
}
export type ListBlock = BlockBase & {
  kind: "list"
  items: Array<{ id: string; title: string; description?: string; meta?: string; status?: string; tone?: Tone; href?: string }>
}
export type LineChartBlock = BlockBase & {
  kind: "line-chart"
  x_label?: string
  y_format?: ValueFormat
  series: Array<{ key: string; label: string }>
  points: Array<{ x: string; values: Record<string, number> }>
}
export type BarChartBlock = BlockBase & {
  kind: "bar-chart"
  value_format?: ValueFormat
  bars: Array<{ label: string; value: number; tone?: Tone }>
}
export type CalendarBlock = BlockBase & {
  kind: "calendar"
  date: string
  events: Array<{ id: string; title: string; start: string; end?: string; location?: string; tone?: Tone }>
}
export type TableBlock = BlockBase & {
  kind: "table"
  columns: Array<{ key: string; label: string; format?: ValueFormat }>
  rows: Array<Record<string, string | number | boolean | null>>
}
export type ProgressBlock = BlockBase & {
  kind: "progress"
  items: Array<{ label: string; value: number; max: number; value_label?: string; tone?: Tone }>
}
export type NoticeBlock = BlockBase & { kind: "notice"; body: string; tone: Tone; action?: { label: string; href: string } }
export type TimelineBlock = BlockBase & {
  kind: "timeline"
  items: Array<{ label: string; title: string; description?: string; tone?: Tone }>
}
export type TextBlock = BlockBase & { kind: "text"; body: string }
export type DashboardBlock =
  | MetricGroupBlock
  | ListBlock
  | LineChartBlock
  | BarChartBlock
  | CalendarBlock
  | TableBlock
  | ProgressBlock
  | NoticeBlock
  | TimelineBlock
  | TextBlock

export type Snapshot = {
  schema_version: string
  snapshot_id: string
  source_id: string
  generated_at: string
  effective_period: { start: string; end: string; timezone: string }
  status: "success" | "partial" | "failed"
  sources: Array<{ label: string; status: "ok" | "stale" | "unavailable" | "manual"; as_of: string; reference?: string }>
  freshness: { expires_at: string; next_expected_at?: string }
  quality: { confidence: "high" | "medium" | "low"; warnings: string[] }
  privacy: { classification: "public" | "private" | "sensitive"; contains_personal_data: boolean; synthetic: boolean }
  data: {
    title: string
    summary: string
    attention?: "none" | "low" | "medium" | "high"
    facts?: Record<string, unknown>
    presentation: { layout: "dashboard" | "focus" | "timeline"; blocks: DashboardBlock[] }
  }
}
export type SourceDefinition = {
  id: string
  domain: string
  source: string
  label: string
  description: string
  freshness_sla_hours: number
  dashboard_role: "primary" | "supporting"
}
export type InstanceConfig = {
  brand_name: string
  brand_mark: string
  tagline: string
  timezone: string
  locale: string
  currency: string
  week_starts_on: "monday" | "sunday"
  enabled_sources: string[]
  theme: {
    preset: "sage" | "ocean" | "plum" | "sand" | "custom"
    default_mode: "system" | "light" | "dark"
    density: "compact" | "comfortable"
    radius: string
    font_family: "system" | "humanist" | "editorial" | "rounded" | "mono"
    heading_style: "plain" | "compact" | "expressive"
    custom_tokens: Partial<
      Record<
        "light" | "dark",
        Record<
          | "primary"
          | "primary_foreground"
          | "accent"
          | "accent_foreground"
          | "background"
          | "foreground"
          | "card"
          | "card_foreground"
          | "border"
          | "sidebar"
          | "sidebar_foreground"
          | "chart_1"
          | "chart_2"
          | "chart_3",
          string
        >
      >
    >
  }
  storage: { snapshot_encryption: boolean }
}
export type DashboardData = {
  generatedAt: string
  demoMode: boolean
  instance: InstanceConfig
  sources: Array<{
    definition: SourceDefinition
    snapshot: Snapshot | null
    freshnessState: "fresh" | "aging" | "stale" | "partial" | "failed" | "missing"
  }>
  historyBySource: Record<string, Snapshot[]>
}
