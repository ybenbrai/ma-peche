"use client"

import { useEffect } from "react"
import { Ban, CheckCircle2, Droplets, Loader2, X } from "lucide-react"

export type LegalStatus = "allowed" | "forbidden" | "no-water"

export interface LegalCheckResult {
  status: LegalStatus
  zoneName?: string
  reason?: string
  permitInfo?: string
}

export function LegalCheckOverlay({
  checking,
  result,
  onClose,
}: {
  checking: boolean
  result: LegalCheckResult | null
  onClose: () => void
}) {
  const open = checking || result !== null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  if (checking) {
    return (
      <>
        <div
          className={`fixed inset-0 z-[2000] bg-black/60 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-[2001] mx-auto max-w-md rounded-t-3xl bg-card px-6 pb-8 pt-4 shadow-2xl transition-transform duration-300 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Vérification...
            </p>
            <p className="text-sm text-muted-foreground">
              Interrogation des données officielles
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!result) return null

  const config =
    result.status === "allowed"
      ? {
          Icon: CheckCircle2,
          color: "#22c55e",
          bg: "rgba(34,197,94,0.15)",
          title: "Autorisée",
        }
      : result.status === "forbidden"
        ? {
            Icon: Ban,
            color: "#ef4444",
            bg: "rgba(239,68,68,0.15)",
            title: "Interdite",
          }
        : {
            Icon: Droplets,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.15)",
            title: "Aucun cours d'eau",
          }

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] bg-black/60 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-label={config.title}
        className="fixed inset-x-0 bottom-0 z-[2001] mx-auto max-w-md rounded-t-3xl bg-card px-6 pb-8 pt-4 shadow-2xl transition-transform duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center">
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        </div>

        <div className="flex flex-col items-center gap-4 py-6">
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ backgroundColor: config.bg }}
          >
            <config.Icon
              className="size-10"
              style={{ color: config.color }}
              aria-hidden
            />
          </div>

          <h2 className="text-xl font-bold text-foreground">
            {config.title}
          </h2>

          {result.status === "allowed" && (
            <div className="w-full space-y-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Zone</p>
                <p className="text-sm font-medium text-foreground">
                  {result.zoneName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Permis requis</p>
                <p className="text-sm font-medium text-foreground">
                  {result.permitInfo}
                </p>
              </div>
            </div>
          )}

          {result.status === "forbidden" && (
            <div className="w-full space-y-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Raison</p>
                <p className="text-sm font-medium text-foreground">
                  {result.reason}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Approchez-vous d&apos;une zone autorisée sur ce cours d&apos;eau
              </p>
            </div>
          )}

          {result.status === "no-water" && (
            <p className="text-center text-sm text-muted-foreground">
              Approchez-vous d&apos;une rivière
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-center text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <X className="mr-2 inline size-4" aria-hidden />
            Fermer
          </button>
        </div>
      </section>
    </>
  )
}
