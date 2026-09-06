# Design system

Zaati OS helps someone understand their day and decide what deserves attention. Every page needs a clear purpose, evidence for its claims, and a manageable next step.

## Shared frame

All pages use the same content frame, capped at 1600px, with 16/24/32px responsive gutters. The sidebar is 256px wide on desktop. `dashboard`, `focus`, and `timeline` change the internal column arrangement, never the outer page width. Three-column dashboards begin at 1280px; smaller screens stack blocks to protect readable card widths. Long paragraphs can have a readable line length inside that frame.

The instance's `enabled_sources` order controls navigation. The daily overview comes first in the example instance. Setup and Component lab sit below the everyday pages. The demo opens on Today and offers the tour from Start here instead of interrupting the first visit. Demo freshness is evaluated at the clearly labeled example date; personal instances continue using the real clock.

## Visual language

- White/charcoal cards on a quiet neutral workspace surface, subtle borders, and flat content panels.
- Palette colors belong to charts, actions, and meaningful status indicators. Do not tint the entire workspace.
- Page titles: 24–30px, medium weight. Section titles: 16px, medium. Body: 14px with comfortable line height. Metrics: 24–32px tabular numerals.
- A connected metric strip uses separators, not a stack of colored cards. Values get emphasis through size, not a different background per metric.
- Keep the page title and summary concise. Use ordinary labels such as Agenda, Inbox, and Money. Avoid slogans and motivational claims.
- Static cards do not lift or cast hover shadows. Controls retain obvious focus and hover states.

The editorial font option applies serif typography to headings while retaining sans-serif navigation, controls, and data. Short supporting lists, progress panels, and text fit their content instead of stretching to the height of a neighboring chart or calendar. Metric panels can still share the height of their paired chart.

Owned shadcn-compatible primitives live in `src/components/ui/`. Use their shared Card, Button, Input, Dialog, Tabs, Badge, and Progress composition. Preserve semantic tokens and the component generator contract.

## Page composition

Start with a purpose statement and a short finding. Follow it with a small metric strip only when the metrics answer useful questions. Put the primary evidence next, then supporting context. Normally use 3–6 blocks; this is guidance, not a quota. A reading page may need only two.

| Page          | Reader's question                          | Primary evidence                                                   |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Today         | What deserves attention today?             | Commitments and explicit message deadlines                         |
| Agenda        | What is happening, and how do I prepare?   | Timed events and preparation tasks                                 |
| Inbox         | What do I need to answer?                  | Deadline-ordered response queue, separate waiting list             |
| Work          | What should move next?                     | Owned items, current states, concrete next steps                   |
| Money         | What do I have, and is the plan covered?   | Balance history, budget allocation, holdings, reserve calculation  |
| Briefing      | What is worth reading, and why?            | Selected summaries, source links, follow-up questions              |
| Weekly review | What happened, and what should I try next? | Dated observations, explicit limits, a modest next-week experiment |

Do not repeat a queue as a list, timeline, and table. Do not add topic-count or status-allocation charts when they add no decision value. Do not invent comparison periods, financial scenarios, shipment claims, or causal explanations to make a page look complete. Missing evidence is a valid finding.

## Data display

| Element   | Rule                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics   | Usually 3–4; label the unit and period. A change requires a real comparison. Its sign alone does not establish whether it is good or bad. |
| Tables    | Use two columns or full width for prose-heavy rows. Preserve the exact next step beside its item.                                         |
| Lines     | Use for ordered observations; keep comparison units compatible. Explain what the data does and does not establish.                        |
| Bars      | Use for meaningful category comparisons with a zero baseline.                                                                             |
| Donuts    | Use only for parts of a meaningful total. The money allocation must reconcile to tracked balances.                                        |
| Calendars | Retain start/end times, all-day state, and the instance time zone. Do not infer available hours without a workday boundary.               |
| Evidence  | Keep freshness visible; disclose source timestamps and caveats without surrounding every section with warning cards.                      |

Cartesian charts measure their container so the complete trend remains visible on phones with readable axis labels. Exact data lives in a native `View data` table; only dense data tables scroll horizontally. Donuts adapt to their container width, expose full values in the legend, and support persistent click/tap/keyboard selection. The compact center is a summary, not the only value representation.

Component lab demonstrates all eleven safe block kinds. Small catalog-only examples live in `data/component-examples.json` and are schema-validated. A consumer page should never carry filler just to demonstrate the renderer's capabilities.

## Evidence-rich overview and task tables

Money uses a compact two-by-two metric panel beside the dominant balance-history chart. This puts the current position, comparison, and trajectory in the first section. The next row explains the monthly allocation and asset mix; holdings and reserve goals follow. This is a reusable composition of existing block spans, not a finance-specific React page.

Optional `metric.trend` accepts a period `label` and 2–24 labeled numeric `points`. Sparklines use a restrained area fill and an expandable exact-value list. Supply recorded observations, never generated decorative curves. In the synthetic Money example, `facts.balance_history` is the source for all three sparklines and the main chart; the final observation reconciles to accounts. Balance change includes cash flows and is explicitly not described as return. Omit trends when history is unavailable. All points use the metric's unit and format; different sparklines have independent scales and should not be compared by slope.

Optional `table.searchable` enables text search, sortable headers, a matching-item count, and ten-row pagination. Set a column's `filterable: true` to add an exact-value filter. Optional column `tones` maps up to twelve literal cell values to semantic badge tones. Filters combine with search and Clear resets them. Empty results state what happened. Work uses a full-width table for task, status, priority, deadline, and next step. These controls explore the current snapshot; they never imply that a task or account was edited.

These are additive optional fields on existing safe blocks. Existing snapshots remain valid. Forkers must update their schema and renderer together before producing snapshots with these fields. No arbitrary component names, markup, styling, or event handlers are accepted from data.

## Motion and accessibility

Use brief entrance motion, never continuous activity. Charts reveal without changing their final measured coordinates. Existing reduced-motion preferences disable perceptible animation. Controls need usable touch targets, readable contrast, accessible names, and visible keyboard focus. Preserve data equivalents for charts and scroll containment for wide tables.

Review every source page in desktop/mobile and light/dark. `npm run accessibility:check` covers the responsive matrix, contrast, overflow, chart interactions, reduced motion, and built-in palettes. Automated checks do not replace a human screen-reader or physical-device review.

## Research and design decisions

Reviewed September 6, 2026. These are composition references and published guidance, not claims that a template alone proves usability.

| Source                                                                                                                   | Observation or guidance                                                            | Application to Zaati                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Studio Admin analytics](https://next-shadcn-admin-dashboard.vercel.app/dashboard/analytics) and the supplied screenshot | Connected metric row; clear comparison periods; detailed data follows summaries    | Neutral metric strip, consistent header and gutters, evidence before decoration                      |
| [Studio Admin tasks](https://next-shadcn-admin-dashboard.vercel.app/dashboard/tasks)                                     | Search, status and priority filters, sorting and pagination                        | Full-width, filterable Work table with meaningful task content                                       |
| [Studio Admin finance](https://next-shadcn-admin-dashboard.vercel.app/dashboard/finance)                                 | Balance comparisons, spending history, allocation, and account detail              | Dense overview with measured history and restrained color                                            |
| [Shadcn UI Kit finance](https://shadcnuikit.com/dashboard/finance)                                                       | Balances, expenses, goals, and transactions are distinct sections                  | Balance and plan views remain distinct; do not copy commercial actions into a read-only snapshot app |
| [Shadcn UI Kit project management](https://shadcnuikit.com/dashboard/project-management)                                 | Project-level information and a detailed project table                             | Pair each item with its state and next step; skip unrelated revenue and lead metrics                 |
| [Carbon dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)                                       | Limit nonessential metrics; use hierarchy and consistent spacing/color assignments | Reduce redundant blocks and keep one stable page frame                                               |
| [NN/g complex applications](https://www.nngroup.com/articles/complex-application-design/)                                | Reduce clutter while preserving access to secondary information                    | Keep source details and chart values available through disclosure                                    |
| [PatternFly dashboard guidelines](https://www.patternfly.org/patterns/dashboard/design-guidelines/)                      | Start from requirements and user tasks                                             | Define the question each page answers before choosing its components                                 |

The specific widths, typography, and page recipes above are Zaati design decisions informed by those references. No paid template code, third-party fonts, telemetry, new chart library, or snapshot-controlled markup is introduced.

## Page review, September 6

| Page          | Treatment                                                             | Content check                                                                  |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Today         | Connected metrics, chronological agenda, numbered attention queue     | Deadlines remain visible beside the requested response                         |
| Agenda        | Date tile, timezone, separate start/end labels, duration and location | All-day events stay separate from timed durations; events sort chronologically |
| Inbox         | Numbered response queue, count badges, compact waiting panel          | Waiting does not imply a reply is needed                                       |
| Work          | Spacious task rows with stronger item names and status filters        | Exact next steps remain beside the task                                        |
| Money         | Balance history with shared metric panel, compact supporting goals    | Provisional prices and balance-versus-return distinction remain visible        |
| Briefing      | Ranked reading rows and a separate questions list                     | Questions are not presented as a chronological sequence                        |
| Weekly review | Recorded counts, chart, bounded experiments and evidence              | Reply-window suggestions defer to explicit deadlines                           |
| Start here    | Same frame and active navigation treatment                            | Three setup steps remain the entry point                                       |
| Component lab | shadcn category tabs, intersecting text search, visible result count  | Empty results and clipboard failure have explicit feedback                     |

Queue numbering continues through expanded items. Static notices, calendar events, and timeline markers do not lift or grow on hover. The component catalog uses the existing shadcn Tabs and Input primitives; no new runtime dependencies or snapshot fields are required.
