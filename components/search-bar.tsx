"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, MapPin, Search, X } from "lucide-react"

export interface SearchResult {
  label: string
  lat: number
  lng: number
}

export function SearchBar({
  onSelect,
}: {
  onSelect: (result: SearchResult) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        // bias results to the Meuse corridor (Namur ↔ Huy)
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr` +
          `&viewbox=4.70,50.62,5.35,50.36&bounded=0&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { signal: controller.signal })
        const data: Array<{
          display_name: string
          lat: string
          lon: string
        }> = await res.json()
        setResults(
          data.map((d) => ({
            label: d.display_name,
            lat: Number.parseFloat(d.lat),
            lng: Number.parseFloat(d.lon),
          })),
        )
      } catch {
        /* aborted or network error — ignore */
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [])

  function choose(r: SearchResult) {
    onSelect(r)
    setQuery(r.label.split(",")[0])
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/90 px-3.5 shadow-lg backdrop-blur-md">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un lieu sur la Meuse…"
          aria-label="Rechercher un lieu"
          className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setResults([])
            }}
            aria-label="Effacer la recherche"
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onClick={() => choose(r)}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="line-clamp-2 text-sm text-foreground/90">
                  {r.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
