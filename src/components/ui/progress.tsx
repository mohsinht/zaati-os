import { cn } from "@/lib/utils"

export function Progress({ value, className, indicatorClassName, label }: { value: number; className?: string; indicatorClassName?: string; label: string }) {
  const normalized = Math.max(0, Math.min(100, value))
  return <div aria-label={label} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(normalized)} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} role="progressbar"><div className={cn("h-full bg-primary transition-[width]", indicatorClassName)} style={{ width: `${normalized}%` }} /></div>
}
