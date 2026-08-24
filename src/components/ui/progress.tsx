import { cn } from "@/lib/utils"

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}><div className={cn("h-full bg-primary transition-[width]", indicatorClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}
