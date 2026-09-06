# Page-by-page cohesion audit

September 6, 2026. This review supersedes the visual direction of the earlier showcase pass. The earlier work improved controls but did not resolve uneven widths, duplicated content, or an overly decorative visual hierarchy.

## What changed

| Page          | Problem found                                                                                                        | Revised value and composition                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today         | A slogan, historical chart, repeated actions, and an overly narrow source table competed with the current day        | Four blocks: daily measures, timetable, two deadlines, source evidence. No motivational headline.                                                                                     |
| Agenda        | Focus layout narrowed the page; the calendar was repeated as an energy timeline; open hours lacked a defined workday | Four blocks: derived schedule measures, calendar, prep, one buffer note.                                                                                                              |
| Inbox         | Four replies were claimed although one item was waiting; the same messages appeared in three views                   | Three blocks: status counts, deadline-ordered response queue, separate waiting list.                                                                                                  |
| Work          | Status donut repeated counts; invented delivery-check progress competed with the actual work                         | Two blocks: state summary and full-width searchable task table, with status/priority filters, sorting, deadlines, and next steps.                                                     |
| Money         | Decorative projection curves lacked a reproducible model; detail was spread across too many sections                 | Seven blocks: a compact metric panel with three sparklines beside balance history; budget, allocation, filterable holdings, goals, and price caveat. All history reconciles to facts. |
| Briefing      | The narrow narrative layout and topic-count chart did little to help someone choose what to read                     | Two blocks: selected reading and questions to investigate. Fictional story/link status is explicit.                                                                                   |
| Weekly review | Narrow stacked sections claimed better output and causation that the evidence did not establish                      | Four blocks: recorded counts, dated trend, next-week experiment, evidence limits. No invented shipment history.                                                                       |
| Start here    | A large promotional heading and technical introduction preceded usable value                                         | Modest welcome, plain purpose, optional tour. The demo initially opens Today.                                                                                                         |
| Component lab | Developer content sat among daily tasks; consumer pages carried blocks merely to fill the catalog                    | Moved below everyday navigation. A schema-validated text fixture preserves full block coverage without filler on source pages.                                                        |

All pages now share the same outer frame, neutral surfaces, section typography, and metric strip. Layout modes remain available for forkers but only alter internal columns. Source ordering follows instance configuration. The default demo and `/examples` use identical source snapshots so visitors do not see an older, less coherent set of pages.

## Research

The [design system](design-system.md#research-and-design-decisions) records the web research, direct demo links, and how each reference affected the implementation. The supplied Studio Admin screenshot is the main visual reference. The task and finance demos, plus the supplied financial sparklines and store overview, also informed the denser metric/chart composition and interactive data tables.

## Review protocol

Review the production app locally and inspect every page at 1440px and 390px in both themes. Capture each source page under `examples/screenshots`. Run the existing five-width accessibility matrix, check contained horizontal scrolling, inspect metric and body wrapping, exercise chart selection and data disclosure, and verify reduced motion. Run `npm run check` for contracts, privacy, tests, build, tutorial, and performance.

A calm page may have fewer cards than another page. Consistency means stable navigation, typography, spacing, and interaction; it does not mean adding unsupported metrics to make every page equally full. This is an implementation and expert visual review, not a claim of user testing or accessibility certification.

## Content integrity checks

- Today, Agenda, Inbox, and Work agree on the homepage work and message deadlines. Waiting messages are excluded from reply counts.
- Money: cash 22,600 + invested 82,200 = tracked 104,800. The final historical point agrees with those balances. Monthly allocations total 6,500. Emergency reserve uses 15,800 / 3,100; total cash runway uses 22,600 / 3,100. Price freshness remains visible.
- Weekly review: daily focus entries total 18 blocks and interruptions total 19. Observations are not presented as proof of causality.
- Demo page dates use the snapshot generation date, while source/effective-period detail remains available. The sample clock is stable without altering real-instance freshness.

## Completed validation

- `npm run check` passed: formatting, lint, repository checks, contracts/privacy, build, 56 tests with coverage gates, tutorial, performance, and accessibility.
- Chromium completed 107 axe audits, including every source page, Start here, and Component lab at 320, 390, 768, 1024, and 1440px in light/dark themes, plus palettes and dialogs. No document overflow was found.
- Search, no-results recovery, status filtering, Clear, ascending/descending sorting, chart data disclosure, donut selection, keyboard activation, and reduced motion passed interaction checks.
- Visual review corrected compact currency wrapping, incomplete mobile chart histories, empty cells in odd-sized metric strips, and obsolete example wording. Cartesian charts now retain the complete history on narrow screens.
- Twenty-eight full-page source screenshots, a Money preview, and six refreshed onboarding/dashboard documentation captures were produced locally from synthetic data.
- Measured build budgets: JavaScript 112 KB gzip, CSS 10 KB gzip, dashboard data 89 KB gzip. No runtime dependency was added.

The automated accessibility checks and visual inspection do not establish usability with real users or replace assistive-technology testing.
