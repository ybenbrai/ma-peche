"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet"
import { Fish, BookOpen, ExternalLink, Ban, X, LocateFixed, Loader2, Plus, Minus, Sun, Moon, ShieldCheck } from "lucide-react"
import "leaflet/dist/leaflet.css"

import { SearchBar, type SearchResult } from "@/components/search-bar"
import { ZoneSheet } from "@/components/zone-sheet"
import { Legend } from "@/components/legend"
import { parseWmsFeature, mergeNightFishing } from "@/lib/zones"
import type { FishingZone } from "@/lib/zones"
import {
  LegalCheckOverlay,
  type LegalCheckResult,
} from "@/components/legal-check-overlay"

const WMS_URL = "https://geoservices.wallonie.be/arcgis/services/EAU/LEGIS_PECHE/MapServer/WMSServer"

const SPECIES_PDFS = [
  {
    label: "Eaux calmes et mixtes",
    url: "https://cartodoc.wallonie.be/documents/LEGIS_PECHE/Espèces pêchables calmes et mixtes.pdf",
  },
  {
    label: "Eaux vives",
    url: "https://cartodoc.wallonie.be/documents/LEGIS_PECHE/Espèces pêchables vives.pdf",
  },
  {
    label: "Lacs",
    url: "https://cartodoc.wallonie.be/documents/LEGIS_PECHE/Espèces pêchables lacs.pdf",
  },
  {
    label: "Plate Taille",
    url: "https://cartodoc.wallonie.be/documents/LEGIS_PECHE/Espèces pêchables Plate Taille.pdf",
  },
]

export function MeuseApp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const lRef = useRef<typeof import("leaflet") | null>(null)
  const gpsMarkerRef = useRef<Marker | null>(null)

  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<FishingZone | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [checkingLegal, setCheckingLegal] = useState(false)
  const [legalResult, setLegalResult] = useState<LegalCheckResult | null>(null)
  const [showBait, setShowBait] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("ma-peche-theme", next ? "dark" : "light")
    setDark(next)
  }, [])

  // ---- initialise the Leaflet map (client only) ----
  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false
    let map: LeafletMap | null = null

    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      lRef.current = L

      map = L.map(containerRef.current, {
        center: [50.49, 5.05],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      })
      mapRef.current = map

      map.doubleClickZoom.disable()

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19 },
      ).addTo(map)

      // Wallonia official fishing zones WMS — covers every river in Wallonia
      // Custom pane with brightness/saturation boost (server returns blue/red/orange)
      map.createPane("wmsPane")
      const wmsPane = map.getPane("wmsPane")!
      wmsPane.style.zIndex = "450"
      wmsPane.style.filter = "brightness(1.6) saturate(2)"

      const wms = L.tileLayer.wms(WMS_URL, {
        layers: "1",
        format: "image/png",
        transparent: true,
        opacity: 0.85,
        maxZoom: 19,
        pane: "wmsPane",
      })
      wms.addTo(map)

      // Pane for private-zone overlays (no brightness/saturation boost)
      map.createPane("privatePane")
      const privatePane = map.getPane("privatePane")!
      privatePane.style.zIndex = "460"

      // Private / restricted-access zone overlays
      ;(async () => {
        const privUrl =
          "https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer/0/query" +
          "?f=json" +
          "&where=DROIT_PECH+%3D+%27Priv%C3%A9%27+OR+UPPER(INFO_COMPL)+LIKE+%27%25ACC%C3%88S+INTERDIT%25%27" +
          "&outFields=NOM_VH,DROIT_PECH,INFO_COMPL" +
          "&returnGeometry=true&outSR=4326"
        try {
          const res = await fetch(privUrl)
          const data = await res.json()
          const features: any[] = data.features || []
          for (const f of features) {
            const attrs = f.attributes || {}
            const rings: number[][][] = f.geometry?.rings
            if (!rings || !rings.length) continue
            const latlngs = rings[0].map((p: number[]) => [p[1], p[0]] as [number, number])
            L.polygon(latlngs, {
              color: "#f97316",
              weight: 3,
              opacity: 0.8,
              fillColor: "#f97316",
              fillOpacity: 0.15,
              pane: "privatePane",
            }).addTo(map).bindTooltip(attrs.NOM_VH + " — Privé", {
              permanent: false,
              direction: "center",
              className: "private-tooltip",
            })
          }
        } catch { /* silent */ }
      })()

      // Tap zone → ArcGIS REST query → bottom-sheet
      const m = map
      let lastDrag = 0
      m.on("dragstart", () => { lastDrag = Date.now() })
      m.on("click", async (e: LeafletMouseEvent) => {
        if (Date.now() - lastDrag < 300) return
        const { lat, lng } = e.latlng
        const baseUrl =
          `https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer`
        const geoQ = `geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false`
        try {
          const [dayRes, nightRes] = await Promise.all([
            fetch(`${baseUrl}/0/query?f=json&${geoQ}`),
            fetch(`${baseUrl}/1/query?f=json&${geoQ}`),
          ])
          const dayData = await dayRes.json()
          const nightData = await nightRes.json()
          const dayFeatures = dayData.features || []
          if (dayFeatures.length === 0) return
          const zone = parseWmsFeature(
            (dayFeatures[0].attributes || {}) as Record<string, unknown>,
          )
          if (zone) {
            const nightProps = (nightData.features?.[0]?.attributes || {}) as Record<string, unknown>
            const merged = mergeNightFishing(zone, nightProps)
            setSelectedZone(merged)
            setSheetOpen(true)
            setShowBait(false)
            setShowSpecies(false)
          }
        } catch {
          // silent
        }
      })

      // fit to Meuse corridor
      map.fitBounds(
        [[50.3, 4.7], [50.7, 5.4]],
        { padding: [60, 60] },
      )

      setReady(true)
    })()

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
    }
  }, [])

  // ---- GPS locate ----
  const handleLocate = useCallback(() => {
    const map = mapRef.current
    const L = lRef.current
    if (!map || !L) return
    if (!("geolocation" in navigator)) {
      setGeoError("Géolocalisation non disponible sur cet appareil.")
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const latlng: [number, number] = [latitude, longitude]
        if (gpsMarkerRef.current) {
          gpsMarkerRef.current.setLatLng(latlng)
        } else {
          const icon = L.divIcon({
            className: "",
            html: '<div class="relative grid place-items-center"><span class="gps-pulse"></span><span class="gps-dot"></span></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })
          gpsMarkerRef.current = L.marker(latlng, {
            icon,
            interactive: false,
          }).addTo(map)
        }
        map.flyTo(latlng, 14, { duration: 0.8 })
        setLocating(false)
      },
      () => {
        setGeoError("Impossible d'obtenir votre position.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  // ---- search result fly-to ----
  const handleSearch = useCallback((r: SearchResult) => {
    mapRef.current?.flyTo([r.lat, r.lng], 14, { duration: 0.8 })
  }, [])

  // ---- open external link ----
  const handleOpenLink = useCallback((url: string) => {
    if (url) window.open(url, "_blank", "noopener")
  }, [])

  // ---- zoom helpers ----
  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn()
  }, [])
  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut()
  }, [])

  // ---- "Am I legal?" GPS + GetFeatureInfo ----
  const checkLegal = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (!("geolocation" in navigator)) {
      setGeoError("Géolocalisation non disponible sur cet appareil.")
      return
    }

    setCheckingLegal(true)
    setLegalResult(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const latlng: [number, number] = [latitude, longitude]

        map.flyTo(latlng, 14, { duration: 0.8 })

        try {
          const url =
          `https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer/0/query` +
            `?f=json` +
            `&geometry=${longitude},${latitude}` +
            `&geometryType=esriGeometryPoint` +
            `&inSR=4326` +
            `&outSR=4326` +
            `&spatialRel=esriSpatialRelIntersects` +
            `&outFields=*` +
            `&returnGeometry=false`

          const res = await fetch(url)
          const data = await res.json()
          const features = data.features || []

          if (features.length === 0) {
            setLegalResult({ status: "no-water" })
            setCheckingLegal(false)
            return
          }

          const props = features[0].attributes || {}
          const pechJour = ((props.PECH_JOUR as string) || "").toLowerCase()
          const prelevement = ((props.PRELEVEMENT as string) || "").toLowerCase()
          const zoneName =
            (props.NOM_VH as string) ||
            (props.NOM as string) ||
            "Zone de pêche"

          if (pechJour.includes("interdite")) {
            setLegalResult({
              status: "forbidden",
              zoneName,
              reason:
                (props.DESC_INT as string) ||
                "Pêche interdite dans cette zone",
            })
          } else {
            setLegalResult({
              status: "allowed",
              zoneName,
              permitInfo:
                prelevement === "interdit"
                  ? "Permis A minimum · No-kill"
                  : "Permis A minimum",
            })
          }
        } catch {
          setLegalResult({ status: "no-water" })
        }

        setCheckingLegal(false)
      },
      () => {
        setGeoError("Impossible d'obtenir votre position.")
        setCheckingLegal(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* map */}
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label="Carte des zones de pêche sur la Meuse" role="application" />

      {/* loading veil */}
      {!ready && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-background">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Chargement de la carte…</p>
          </div>
        </div>
      )}

      {/* top bar: title + search */}
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="pointer-events-none flex items-center gap-2 px-1">
            <span
              className="size-2.5 rounded-full bg-primary"
              aria-hidden
            />
            <h1 className="text-sm font-semibold tracking-tight text-foreground drop-shadow">
              Ma Pêche
            </h1>
          </div>
          <SearchBar onSelect={handleSearch} />
        </div>
      </header>

      {/* Zone detail sheet */}
      <ZoneSheet
        zone={selectedZone}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setShowBait(false); setShowSpecies(false) }}
      />

      {/* GPS button */}
      <button
        type="button"
        onClick={handleLocate}
        aria-label="Centrer sur ma position"
        className="absolute right-4 z-[600] grid size-12 place-items-center rounded-2xl border border-border bg-card/90 text-foreground shadow-lg backdrop-blur-md transition hover:bg-accent active:scale-95"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12rem)" }}
      >
        {locating ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <LocateFixed className="size-5 text-primary" />
        )}
      </button>

      {/* zone action buttons */}
      <div
        className="absolute right-4 z-[1100] flex flex-col overflow-hidden rounded-2xl border border-border bg-card/90 shadow-lg backdrop-blur-md"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 18rem)" }}
      >
        <button
          type="button"
          onClick={() => setShowSpecies(true)}
          aria-label="Espèces pêchables"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
          <Fish className="size-5" />
        </button>
        <span className="h-px bg-border" />
        <button
          type="button"
          onClick={() => handleOpenLink("https://cartodoc.wallonie.be/documents/LEGIS_PECHE/Identification poissons.pdf")}
          aria-label="Identifier un poisson"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
          <BookOpen className="size-5" />
        </button>
        <span className="h-px bg-border" />
        <button
          type="button"
          onClick={() => setShowBait(!showBait)}
          aria-label="Appâts interdits"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
            <Ban className="size-5" />
        </button>
      </div>

      {/* species picker modal */}
      {showSpecies && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-6"
          onClick={() => setShowSpecies(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSpecies(false)}
              aria-label="Fermer"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </button>
            <h3 className="mb-3 text-sm font-semibold text-foreground/90">
              Espèces pêchables
            </h3>
            <div className="space-y-1.5">
              {SPECIES_PDFS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { handleOpenLink(p.url); setShowSpecies(false) }}
                  className="flex w-full items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-left text-[13px] font-medium text-foreground/85 transition-colors hover:bg-accent"
                >
                  <span className="grow">{p.label}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-foreground/50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* bait detail modal */}
      {showBait && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 px-6"
          onClick={() => setShowBait(false)}
        >
          <div
            className="relative max-w-sm rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowBait(false)}
              aria-label="Fermer"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </button>
            <p className="pr-4 text-[13px] leading-relaxed text-foreground/90">
              Sang, moëlle, cervelle et abats d&apos;animaux (excepté balance à écrevisse) — œufs de poissons — oiseaux, batraciens, mammifères, vivants ou morts, entiers
            </p>
          </div>
        </div>
      )}

      {/* zoom buttons + theme toggle — left side */}
      <div
        className="absolute left-4 z-[600] flex flex-col overflow-hidden rounded-2xl border border-border bg-card/90 shadow-lg backdrop-blur-md"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12rem)" }}
      >
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom avant"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
          <Plus className="size-5" />
        </button>
        <span className="h-px bg-border" />
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom arrière"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
          <Minus className="size-5" />
        </button>
        <span className="h-px bg-border" />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Changer le thème"
          className="flex size-11 items-center justify-center text-foreground transition-colors hover:bg-accent active:bg-accent/70"
        >
          {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>

      {/* legal check button */}
      <button
        type="button"
        onClick={checkLegal}
        disabled={checkingLegal}
        aria-label="Vérifier si je suis en règle"
        className="absolute right-4 z-[600] grid size-12 place-items-center rounded-2xl border border-border bg-card/90 text-foreground shadow-lg backdrop-blur-md transition hover:bg-accent active:scale-95 disabled:opacity-50"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 8.5rem)" }}
      >
        {checkingLegal ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <ShieldCheck className="size-5 text-primary" />
        )}
      </button>

      {/* legend */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto max-w-md">
          {geoError && (
            <p className="mb-2 rounded-xl bg-destructive/90 px-3 py-2 text-center text-xs text-white shadow-lg">
              {geoError}
            </p>
          )}
          <Legend />
        </div>
      </div>

      {/* legal check overlay */}
      <LegalCheckOverlay
        checking={checkingLegal}
        result={legalResult}
        onClose={() => {
          setCheckingLegal(false)
          setLegalResult(null)
        }}
      />
    </main>
  )
}
