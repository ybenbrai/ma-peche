import { Ban, Check, RefreshCw } from "lucide-react"
import type { ZoneStatus } from "@/lib/zones"
import { STATUS_META } from "@/lib/zones"
import { cn } from "@/lib/utils"

const ICONS = {
  allowed: Check,
  forbidden: Ban,
  release: RefreshCw,
} as const

export function StatusBadge({
  status,
  className,
}: {
  status: ZoneStatus
  className?: string
}) {
  const palette: Record<ZoneStatus, { bg: string; fg: string }> = {
    allowed: { bg: "#14532d", fg: "#4ade80" },
    forbidden: { bg: "#7f1d1d", fg: "#fca5a5" },
    release: { bg: "#78350f", fg: "#fb923c" },
  }
  const p = palette[status]
  const Icon = ICONS[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: p.bg,
        color: p.fg,
      }}
    >
      <Icon className="size-3.5" aria-hidden />
      {STATUS_META[status].label}
    </span>
  )
}

export function StatusDot({ status }: { status: ZoneStatus }) {
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-full"
      style={{ backgroundColor: STATUS_META[status].cssVar }}
      aria-hidden
    />
  )
}
