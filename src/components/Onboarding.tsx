import { useState } from "react"
import {
  ArrowRight,
  Check,
  Clipboard,
  Command,
  GitCommitHorizontal,
  KeyRound,
  Palette,
  PlugZap,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { InstanceConfig } from "@/types"

const paths = {
  chatgpt: {
    label: "ChatGPT task",
    icon: Sparkles,
    command: "Use prompts/scheduled-github-bundle.md with GitHub and your connected sources.",
  },
  command: {
    label: "LLM command",
    icon: Command,
    command: "npm run workflow:run -- --adapter command --output-dir data/snapshots -- your-llm-cli --json",
  },
  workflow: { label: "Any workflow", icon: PlugZap, command: "your-flow | npm run snapshot:ingest -- --output-dir data/snapshots" },
} as const

export default function Onboarding({ instance, onOpenDashboard }: { instance: InstanceConfig; onOpenDashboard: () => void }) {
  const [path, setPath] = useState<keyof typeof paths>("chatgpt")
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (value: string, id: string) => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(id)
        window.setTimeout(() => setCopied(null), 1600)
      })
      .catch(() => setCopied(null))
  }
  const selected = paths[path]

  return (
    <section aria-labelledby="welcome-title" className="pb-12">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="positive">
            <Rocket className="mr-1 size-3" />
            Start here
          </Badge>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-5xl" id="welcome-title">
            Three small steps. Then your dashboard wakes up.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Personalize the shell, test one complete LLM loop, then connect your preferred workflow. Zaati OS handles contracts, validation,
            retries, storage, rendering, and deployment plumbing.
          </p>
        </div>
        <Button onClick={onOpenDashboard} variant="outline">
          Explore the demo <ArrowRight className="size-4" />
        </Button>
      </div>

      <ol className="mt-7 grid gap-4 lg:grid-cols-3" aria-label="Quick setup">
        <SetupStep
          command={"npm install\nnpm run setup"}
          description="Choose a name, source pack, visual style, and optional encryption. The generated settings stay ignored."
          number="1"
          onCopy={copy}
          copied={copied === "setup"}
          copyId="setup"
          title="Make it yours"
        />
        <SetupStep
          command="npm run tutorial"
          description="A mock LLM intentionally fails once, receives contract feedback, retries, and atomically creates six synthetic snapshots."
          number="2"
          onCopy={copy}
          copied={copied === "tutorial"}
          copyId="tutorial"
          title="Take a test drive"
        />
        <SetupStep
          command="npm run dev"
          description="Open the local dashboard. When you are ready, replace the mock adapter with one scheduled task or your own command."
          number="3"
          onCopy={copy}
          copied={copied === "dev"}
          copyId="dev"
          title="Voila"
        />
      </ol>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect the AI you already use</CardTitle>
            <CardDescription>One daily run can collect several approved sources and publish every snapshot in one commit.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="LLM connection path">
              {(Object.entries(paths) as Array<[keyof typeof paths, (typeof paths)[keyof typeof paths]]>).map(([id, item]) => {
                const Icon = item.icon
                return (
                  <button
                    aria-selected={path === id}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium",
                      path === id ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted",
                    )}
                    key={id}
                    onClick={() => setPath(id)}
                    role="tab"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-muted/55 p-4" role="tabpanel">
              <div className="flex items-start justify-between gap-3">
                <code className="min-w-0 whitespace-pre-wrap break-words text-xs leading-6">{selected.command}</code>
                <Button
                  aria-label={`Copy ${selected.label} setup`}
                  onClick={() => copy(selected.command, "provider")}
                  size="icon"
                  variant="ghost"
                >
                  {copied === "provider" ? <Check className="size-4 text-positive" /> : <Clipboard className="size-4" />}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              The provider only needs to return the public bundle contract. Credentials, tool permissions, and source access remain inside
              your workflow.
            </p>
          </CardContent>
        </Card>

        <Card className="border-positive/30">
          <CardHeader>
            <div className="mb-2 grid size-9 place-items-center rounded-lg bg-positive/15">
              <ShieldCheck className="size-4 text-positive-foreground" />
            </div>
            <CardTitle className="text-base">Secure from the first real snapshot</CardTitle>
            <CardDescription>Public code and private memory stay separate. Invalid bundles never reach storage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SecurityItem icon={GitCommitHorizontal} text="One atomic commit, no half-refreshed dashboard" />
            <SecurityItem icon={KeyRound} text="Optional authenticated encryption at rest" />
            <SecurityItem icon={ShieldCheck} text="Cloudflare Access before private deployment" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
            <Palette className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Advanced only when you want it</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Add custom sources, turn on encrypted snapshots, define a complete color system, change fonts and heading character, or
              automate deployment. None of that blocks the three-step start.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Current style: {instance.theme.preset}, {instance.theme.font_family}, {instance.theme.heading_style} headers.
            </p>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </p>
    </section>
  )
}

function SetupStep({
  command,
  copied,
  copyId,
  description,
  number,
  onCopy,
  title,
}: {
  command: string
  copied: boolean
  copyId: string
  description: string
  number: string
  onCopy: (value: string, id: string) => void
  title: string
}) {
  return (
    <li className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </span>
        <Button aria-label={`Copy step ${number}`} onClick={() => onCopy(command, copyId)} size="icon" variant="ghost">
          {copied ? <Check className="size-4 text-positive" /> : <Clipboard className="size-4" />}
        </Button>
      </div>
      <h2 className="mt-5 text-base font-semibold">{title}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">{description}</p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs leading-5">
        <code>{command}</code>
      </pre>
    </li>
  )
}

function SecurityItem({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-positive-foreground" />
      <span className="leading-5">{text}</span>
    </div>
  )
}
