"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import type { FishingZone } from "@/lib/zones"
import { StatusBadge } from "@/components/status-badge"
import { nightSummary } from "@/lib/zones"
import {
  FISH_GROUPS,
  getActiveSeason,
  getSeasonPeriods,
  getActiveFieldValue,
  fishInActiveValue,
  getTimelinePosition,
} from "@/lib/season"

export function ZoneSheet({
  zone,
  open,
  onClose,
}: {
  zone: FishingZone | null
  open: boolean
  onClose: () => void
}) {
  const forbidden = zone?.status === "forbidden"

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!zone) return null

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 z-[1199] bg-black/40 transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Détails — ${zone.name}`}
        className={`pointer-events-auto absolute inset-x-0 bottom-0 z-[1200] mx-auto max-w-md rounded-t-3xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        </div>

        <div className="space-y-2 px-5 pb-5 pt-2">

          {/* ---- HEADER ---- */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-foreground">
                {zone.name}
              </h2>
              <div className="mt-1">
                <StatusBadge status={zone.status} />
              </div>
              <p className="mt-1 text-sm leading-tight text-foreground/85">
                {zone.reason}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {zone.nature && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {zone.nature}
                  </span>
                )}
                {zone.zoneEaux && zone.zoneEaux !== "/" && zone.zoneEaux !== "-" && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {zone.zoneEaux}
                  </span>
                )}
                {(zone.droitPech === "Privé" ||
                  (zone.infoCompl || "").toLowerCase().includes("accès interdit")) && (
                  <span className="rounded-md bg-[#7f1d1d] px-1.5 py-0.5 text-[10px] font-medium text-[#fca5a5]">
                    Privé
                  </span>
                )}
                {zone.fedPech && (
                  <span className="text-[11px] text-muted-foreground">
                    {zone.fedPech}
                  </span>
                )}
                {(() => {
                  const s = zone.status
                  let label: string
                  let colorStyle: string
                  if (s === "forbidden") {
                    label = "Interdite"
                    colorStyle = "bg-[#7f1d1d] text-[#fca5a5]"
                  } else if (s === "release") {
                    label = "No-kill"
                    colorStyle = "bg-[#78350f] text-[#fb923c]"
                  } else {
                    label = "Autorisée"
                    colorStyle = "bg-[#14532d] text-[#4ade80]"
                  }
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${colorStyle}`}>
                      ☀️ {label}
                    </span>
                  )
                })()}
                {(() => {
                  const ns = nightSummary(zone.peNuit)
                  const label = ns || "Autorisée"
                  let colorStyle: string
                  if (!ns) {
                    colorStyle = "bg-[#14532d] text-[#4ade80]"       // green — fully allowed
                  } else if (ns === "Interdite") {
                    colorStyle = "bg-[#7f1d1d] text-[#fca5a5]"       // red — forbidden
                  } else {
                    colorStyle = "bg-[#78350f] text-[#fb923c]"       // orange — conditional
                  }
                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${colorStyle}`}
                    >
                      🌙 {label}
                    </span>
                  )
                })()}
              </div>

              {zone.infoCompl && zone.infoCompl !== "/" && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#facc15]">
                  {zone.infoCompl}
                </p>
              )}
              {zone.remZeaux && zone.remZeaux !== "/" && (
                <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                  ⚠️ {zone.remZeaux}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 rounded-full bg-secondary p-2 text-secondary-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>

          {!forbidden && (
            <>
              {/* ---- SAISON (allowed/release only) ---- */}
              <SeasonSection zone={zone} />

              {/* ---- WARNING ---- */}
              {zone.prelevement.toLowerCase() === "interdit" ? (
                <p className="pt-1 text-center text-[11px] font-medium text-[#f87171]">
                  🔴 Remise à l&apos;eau obligatoire — aucun prélèvement
                </p>
              ) : zone.litPrincipal.toLowerCase() === "oui" ? (
                <p className="pt-1 text-center text-[11px] font-medium text-[#4ade80]">
                  ✅ Pêche au vif autorisée dans ce tronçon
                </p>
              ) : null}

              {/* ---- LIVE BAIT RULE ---- */}
              {zone.rPeVif && zone.rPeVif !== "/" && (
                zone.rPeVif.startsWith("http") ? (
                  <button
                    type="button"
                    onClick={() => window.open(zone.rPeVif, "_blank", "noopener")}
                    className="w-full rounded-xl bg-muted px-3 py-2 text-left text-[11px] font-medium text-foreground/80 transition-colors hover:bg-accent"
                  >
                    📄 Conditions pêche au vif
                  </button>
                ) : (
                  <p className="pt-1 text-center text-[11px] font-medium text-[#f87171]">
                    🚫 {zone.rPeVif}
                  </p>
                )
              )}

              {/* ---- PIKE CLOSURE ---- */}
              {zone.r1fev1sjuin && zone.r1fev1sjuin !== "/" && (
                <button
                  type="button"
                  onClick={() => window.open(zone.r1fev1sjuin, "_blank", "noopener")}
                  className="w-full rounded-xl bg-muted px-3 py-2 text-left text-[11px] font-medium text-foreground/80 transition-colors hover:bg-accent"
                >
                  📄 Fermeture du brochet (1 fév → 1er sam juin)
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

const EXTRA_INDIVIDUAL_FISH = [
  { name: "Vairon", groupId: undefined },
  { name: "Goujon", groupId: undefined },
  { name: "Rotengle", groupId: "Groupe 4" },
  { name: "Tanche", groupId: "Groupe 4" },
]

const ALL_FISH: { name: string; groupId: string | undefined }[] = [
  ...FISH_GROUPS.flatMap((g) =>
    g.species.map((s) => ({ name: s, groupId: g.id })),
  ),
  ...EXTRA_INDIVIDUAL_FISH,
]

function SeasonSection({ zone }: { zone: FishingZone }) {
  const today = new Date()
  const year = today.getFullYear()
  const periods = getSeasonPeriods(year)
  const active = getActiveSeason(periods, today)
  const activeValue = getActiveFieldValue(active, zone)
  const timelinePos = getTimelinePosition(today, year)
  const forbidden = zone.status === "forbidden"

  if (forbidden) return null

  const fishWithStatus = ALL_FISH.map((f) => ({
    ...f,
    inSeason: fishInActiveValue(f.name, f.groupId, activeValue),
  }))

  return (
    <div className="space-y-2">
      {/* Active period banner */}
      <div
        className="rounded-xl border border-[#166534] bg-[#14532d] px-3 py-2"
        style={{ fontFamily: "system-ui", textRendering: "optimizeLegibility" }}
      >
        <p
          className="text-[11px] font-bold uppercase text-[#4ade80]"
          style={{ letterSpacing: 0 }}
        >
          🟢 {active?.label ?? "—"}
        </p>
      </div>

      {/* Timeline row */}
      <div className="space-y-1.5" style={{ marginTop: "12px" }}>
        <div className="relative h-3">
          {(() => {
            const totalDays =
              new Date(year, 11, 31).getTime() -
              new Date(year, 0, 1).getTime()
            let cumPct = 0
            return periods.map((p) => {
              const isActive = p.key === active?.key
              const pct =
                ((p.end.getTime() - p.start.getTime()) / totalDays) * 100
              const center = cumPct + Math.max(pct, 8) / 2
              cumPct += Math.max(pct, 8)
              const short =
                p.key === "F1FEV_3SMARS" ? "Fév→Mars"
                : p.key === "F3SMAS_1SJUIN" ? "Mars→Juin"
                : p.key === "F1SJUIN_30SEP" ? "Juin→Sep"
                : "Oct→Jan"
              return (
                <span
                  key={p.key}
                  className={`absolute text-[9.5px] font-medium ${
                    isActive ? "font-bold text-white" : "text-muted-foreground"
                  }`}
                  style={{
                    left: `${center}%`,
                    transform: "translateX(-50%)",
                    top: 0,
                  }}
                >
                  {isActive ? `🟢${short}` : short}
                </span>
              )
            })
          })()}
        </div>
        <div className="flex h-[10px] w-full gap-[2px] rounded-full overflow-hidden">
          {periods.map((p) => {
            const isActive = p.key === active?.key
            const pct =
              ((p.end.getTime() - p.start.getTime()) /
                (new Date(year, 11, 31).getTime() -
                  new Date(year, 0, 1).getTime())) *
              100
            return (
              <div
                key={p.key}
                className="h-full rounded-full transition-colors"
                style={{
                  width: `${Math.max(pct, 8)}%`,
                  backgroundColor: isActive ? "#22c55e" : "#334155",
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Individual fish pills — wrapped flex */}
      <div className="flex flex-wrap gap-1.5">
        {fishWithStatus.map((f) => (
          <div
            key={f.name}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: f.inSeason ? "#22c55e" : "#ef4444" }}
            />
            <span>{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


