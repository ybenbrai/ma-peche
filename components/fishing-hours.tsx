"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Clock, Sunset as SunsetIcon, Sunrise as SunriseIcon } from "lucide-react"

const WALLONIA_LAT = 50.49
const WALLONIA_LNG = 5.05

interface SunData {
  sunrise: Date
  sunset: Date
  fishingStart: Date
  fishingEnd: Date
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s"
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export function FishingHours() {
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(new Date())
  const [sunData, setSunData] = useState<SunData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lat, setLat] = useState(WALLONIA_LAT)
  const [lng, setLng] = useState(WALLONIA_LNG)

  // Try GPS once on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude)
          setLng(pos.coords.longitude)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      )
    }
  }, [])

  // Fetch sunrise/sunset
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const url =
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=today&formatted=0`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.status !== "OK") {
          setError("Impossible de récupérer les heures solaires")
          setLoading(false)
          return
        }
        const sunrise = new Date(data.results.sunrise)
        const sunset = new Date(data.results.sunset)
        const fishingStart = new Date(sunrise.getTime() - 3_600_000)
        const fishingEnd = new Date(sunset.getTime() + 3_600_000)
        setSunData({ sunrise, sunset, fishingStart, fishingEnd })
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Erreur réseau")
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [lat, lng])

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const nowMs = now.getTime()
  const isActive = sunData
    ? nowMs >= sunData.fishingStart.getTime() && nowMs <= sunData.fishingEnd.getTime()
    : false

  let countdownMs = 0
  let countdownLabel = ""
  if (sunData) {
    if (nowMs < sunData.fishingStart.getTime()) {
      countdownMs = sunData.fishingStart.getTime() - nowMs
      countdownLabel = "Débute dans"
    } else if (isActive) {
      countdownMs = sunData.fishingEnd.getTime() - nowMs
      countdownLabel = "Se termine dans"
    } else {
      countdownLabel = "Terminée"
    }
  }

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-border bg-card/90 px-3.5 shadow-lg backdrop-blur-md transition-all">
      {/* ── Always-visible row ── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex h-11 w-full items-center gap-2.5 text-left"
        aria-label="Heures de pêche"
      >
        {/* status dot */}
        <span
          className="relative grid size-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: loading ? "#334155" : isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
        >
          {loading ? (
            <span className="size-3 animate-pulse rounded-full bg-muted-foreground/40" />
          ) : (
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: isActive ? "#22c55e" : "#ef4444" }}
            />
          )}
        </span>

        {/* text */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            {loading
              ? "Chargement..."
              : error
                ? error
                : isActive
                  ? "Pêche autorisée"
                  : "Pêche interdite"}
          </p>
          {sunData && !error && (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {formatTime(sunData.fishingStart)} → {formatTime(sunData.fishingEnd)}
              {countdownLabel !== "Terminée" && countdownMs > 0 && (
                <span className="ml-1.5 font-medium tabular-nums text-foreground/70">
                  · {formatCountdown(countdownMs)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* expand icon */}
        {sunData && !error && (
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </span>
        )}
      </button>

      {/* ── Expanded details ── */}
      {expanded && sunData && !error && (
        <div className="mt-2 space-y-2 border-t border-border pb-2.5 pt-2">
          {/* Schedule */}
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <SunriseIcon className="size-3.5 text-[#fb923c]" />
              <span>Lever</span>
              <span className="font-medium text-foreground">{formatTime(sunData.sunrise)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <SunsetIcon className="size-3.5 text-[#f87171]" />
              <span>Coucher</span>
              <span className="font-medium text-foreground">{formatTime(sunData.sunset)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Début pêche</span>
              <span className="font-medium text-foreground">{formatTime(sunData.fishingStart)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Fin pêche</span>
              <span className="font-medium text-foreground">{formatTime(sunData.fishingEnd)}</span>
            </div>
          </div>

          {/* Countdown */}
          <div
            className="rounded-lg px-2 py-1.5 text-center"
            style={{
              backgroundColor: isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            }}
          >
            <p
              className="text-[10px] font-semibold"
              style={{ color: isActive ? "#16a34a" : "#dc2626" }}
            >
              {countdownLabel}
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {countdownLabel === "Terminée"
                ? "—"
                : formatCountdown(countdownMs)}
            </p>
          </div>

          {!isActive && countdownLabel !== "Terminée" && (
            <p className="text-center text-[10px] text-muted-foreground">
              La pêche est autorisée de {formatTime(sunData.fishingStart)} à{" "}
              {formatTime(sunData.fishingEnd)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
