import { useState } from "react"
import { Braces, CheckCircle2, ChevronLeft, ChevronRight, Database, FileCode2, Rocket, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import type { SourceDefinition } from "@/types"

const steps = [
  {
    icon: Rocket,
    eyebrow: "Welcome",
    title: "See the system before you configure it",
    body: "Everything in this tour is public synthetic data. Explore the interaction model first; your private workspace will remove the demo pages and guides automatically.",
  },
  {
    icon: Database,
    eyebrow: "Sources",
    title: "Each page has one registered owner",
    body: "Agenda, inbox, work, money, news, and aggregate views each publish one validated snapshot. Missing or stale sources stay visible instead of becoming a confident zero.",
  },
  {
    icon: Braces,
    eyebrow: "Components",
    title: "The LLM chooses meaning, not code",
    body: "A snapshot requests an audited block, layout, and span. Zaati OS owns responsive rendering, theme tokens, focus behavior, and accessibility. Component Lab shows the JSON beside the result.",
  },
  {
    icon: FileCode2,
    eyebrow: "Prompts",
    title: "Examples become scheduled-task starting points",
    body: "Every synthetic page can reveal its registered Markdown worker prompt. Replace the placeholders and approve only the source access that worker needs.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Make it yours",
    title: "One command creates the private handoff",
    body: "Run npm run setup. The ignored local configuration switches the workspace to private mode, removes demo-only UI, and leaves a clear path to Prompt Studio, validation, and Access-protected deployment.",
  },
] as const

export default function DemoTour({
  onComplete,
  onOpenComponentLab,
  open,
  sources,
}: {
  onComplete: () => void
  onOpenComponentLab: () => void
  open: boolean
  sources: SourceDefinition[]
}) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const Icon = current.icon
  const finish = (openLab = false) => {
    onComplete()
    if (openLab) onOpenComponentLab()
  }
  return (
    <Dialog onOpenChange={(next) => !next && finish()} open={open}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-2rem))] flex-col overflow-hidden p-0" side="center">
        <div className="shrink-0 border-b border-border p-5 pr-14 sm:p-6 sm:pr-16">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="info">Demo tour</Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {step + 1} of {steps.length}
            </span>
          </div>
          <Progress className="mt-4 h-1" label="Tour progress" value={((step + 1) / steps.length) * 100} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{current.eyebrow}</p>
          <DialogTitle className="mt-2 text-pretty text-2xl font-semibold tracking-[-0.025em]">{current.title}</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-7 text-muted-foreground">{current.body}</DialogDescription>

          {step === 1 ? (
            <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {sources.map((source) => (
                <div className="bg-card p-3" key={source.id}>
                  <p className="text-sm font-medium">{source.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{source.description}</p>
                </div>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                "Metrics",
                "Lists",
                "Line chart",
                "Bar chart",
                "Allocation",
                "Calendar",
                "Table",
                "Progress",
                "Timeline",
                "Notice",
                "Text",
              ].map((label) => (
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium" key={label}>
                  {label}
                </div>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <ol className="mt-5 space-y-2 text-sm" aria-label="Private setup sequence">
              {[
                "Run npm run setup",
                "Generate a prompt with npm run prompt:create",
                "Validate one manual run",
                "Protect the hostname, then deploy",
              ].map((item) => (
                <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5" key={item}>
                  <CheckCircle2 className="size-4 shrink-0 text-positive-foreground" /> {item}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
          <Button onClick={() => finish()} variant="ghost">
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button onClick={() => setStep((value) => value - 1)} variant="outline">
                <ChevronLeft className="size-4" /> Back
              </Button>
            ) : null}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((value) => value + 1)}>
                Next <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => finish(true)}>
                Open Component Lab <Braces className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
