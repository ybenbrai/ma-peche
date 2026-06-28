# Pêche Wallonie — Architecture

## Stack
- **Framework**: Next.js 16 (App Router), React 19
- **Map**: Leaflet 1.9 (`react-leaflet` NOT used — raw Leaflet with dynamic import)
- **Styling**: Tailwind CSS v4 + `tw-animate-css` + `shadcn/tailwind.css`
- **Icons**: lucide-react + emoji fallbacks
- **Build**: TypeScript 5.7 strict, pnpm

## Key Design Decisions
- **SSR-safe**: `"use client"` + `dynamic(() => import(...), { ssr: false })` for map component; `typeof window === "undefined"` guards; `suppressHydrationWarning` on `<body>`
- **Dark theme forced**: `:root` + `.dark` always active; CSS `invert(1) hue-rotate(180deg)` on `.leaflet-tile-pane` for OSM tiles
- **WMS on separate pane**: WMS layer on custom `wmsPane` (z-index 450) to avoid CSS invert filter; boosted with `brightness(1.6) saturate(2)` for contrast
- **Private-zone overlay**: separate `privatePane` (z-index 460) — no brightness/saturation boost
- **Zone action buttons on map**: always visible at z-1100 (above sheet backdrop z-1000), not inside sheet

## File Structure

```
├── app/
│   ├── globals.css          # Dark theme, Leaflet overrides, GPS pulse, private-tooltip
│   ├── layout.tsx           # Root layout — fonts, metadata, viewport, body suppressHydrationWarning
│   └── page.tsx             # Entry — dynamic import of MeuseApp with ssr: false
├── components/
│   ├── meuse-app.tsx        # Main app — map init, WMS, click→ArcGIS query, GPS, legal check,
│   │                        #   zoom buttons, zone action buttons (Fish/BookOpen/Ban on map),
│   │                        #   private-zone polygon overlay, species/bait modals, legend
│   ├── zone-sheet.tsx       # Bottom sheet for zone details
│   ├── status-badge.tsx     # Zone status pill (check/ban/refresh icon + label)
│   ├── legend.tsx           # Bottom-center legend (blue dot, red dot, orange dot)
│   ├── legal-check-overlay.tsx  # Fullscreen GPS legal check result overlay
│   └── search-bar.tsx       # Nominatim search (bias to Meuse corridor)
├── lib/
│   ├── zones.ts             # FishingZone type (25 fields), parseWmsFeature(), mergeNightFishing(),
│   │                        #   pechJourSummary(), nightSummary(), STATUS_META, ZONE_EAUX_COLORS
│   ├── season.ts            # Season periods, fish groups, fishInActiveValue(), getTimelinePosition()
│   └── utils.ts             # cn() helper (clsx + tailwind-merge)
└── package.json
```

## ArcGIS REST API

### Base URL
`https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer`

### Layer 0 — Pêche de jour (day fishing)
- Full field set (24 fields)
- Fields: `PECH_JOUR`, `PRELEVEMENT`, `ZONE_EAUX`, `DESC_INT`, `NATURE`, `FED_PECH`, `LIT_PRINCIP`, `PERMIS_DE_PECHE`, `ESP_PECH`, `APPATS_INTERDIT`, `CLEF_POISSONS`, `F1FEV_3SMARS`, `F3SMAS_1SJUIN`, `F1SJUIN_30SEP`, `F1OCT_31JANV`, `DROIT_PECH`, `INFO_COMPL`, `REM_ZEAUX`, `R_PE_VIF`, `R1FEV_1SJUIN`
- 1273 features total

### Layer 1 — Pêche de nuit (night fishing)
- Sparse field set: `PE_NUIT`, `R_PE_NUIT` (plus shared fields like `NOM_VH`, `INFO_COMPL`, `ZONE_EAUX`, `FED_PECH`, etc.)
- `PE_NUIT` values: `"Interdite"`, `"Carpe autorisée"`, or empty (null → unrestricted)
- `R_PE_NUIT`: PDF URL for night carp fishing rules if `PE_NUIT = "Carpe autorisée"`

### Query pattern (on map click)
Both layers queried in parallel via `Promise.all`:
```
/0/query?f=json&geometry={lng},{lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false
/1/query?f=json&...
```
Layer 1 data merged into FishingZone via `mergeNightFishing()`.

### WMS (tile rendering)
- `WMSServer?service=WMS&request=GetMap&layers=1&...`
- WMS layer 0 = Pêche de nuit, WMS layer 1 = Pêche de jour (SWAPPED vs MapServer layers)
- Renderer: 3-field unique value (`PECH_JOUR` + `ZONE_EAUX` + `PRELEVEMENT`)
- Colors: blue shades (Calmes→dark, Mixtes→medium, Vives→turquoise), orange (no-kill), red (forbidden)

## Zone Status Colors

| Color | Hex | Meaning |
|-------|-----|---------|
| Deep blue | `#0044cc` | Autorisée + Calmes |
| Bright cyan-blue | `#0077ee` | Autorisée + Mixtes |
| Teal-green | `#00bb99` | Autorisée + Vives |
| Orange | `#ffbb33` | No-kill (Prélèvement interdit) |
| Red | `#ff4d4d` | Interdite (forbidden) |
| Default blue | `#4a90d9` | Autorisée (fallback) |

### Badge colors (status-badge.tsx)
- `StatusBadge` uses `ZONE_EAUX_COLORS` for allowed zones with known ZONE_EAUX
- `getZoneColor(zone)` utility function returns the appropriate hex

### Day/Night badges (in zone-sheet.tsx tag row)
- `☀️ Autorisée` — green bg (`#14532d`/`#4ade80`) when day allowed (PECH_JOUR non-interdite + PRELEVEMENT=Autorisé)
- `☀️ No-kill` — orange bg (`#78350f`/`#fb923c`) when day allowed but catch-and-release only (PRELEVEMENT=Interdit)
- `☀️ Interdite` — red bg (`#7f1d1d`/`#fca5a5`) when day forbidden (PECH_JOUR="Interdite")
- `🌙 Autorisée` — green bg when no night restriction (PE_NUIT empty/null/absent)
- `🌙 Carpe uniquement` — orange bg (`#78350f`/`#fb923c`) when night restricted to carp only (PE_NUIT="Carpe autorisée")
- `🌙 Interdite` — red bg when night fishing banned (PE_NUIT="Interdite")

## FishingZone Type (25 fields)
```typescript
interface FishingZone {
  id, name, status, reason, nature, zoneEaux?, fedPech, pechJour, descInt,
  prelevement, litPrincipal, permisDePeche, espPeche, appatsInterdit,
  clefPoissons, f1fev3smars, f3smas1sjuin, f1sjuin30sep, f1oct31janv,
  droitPech, infoCompl, remZeaux, rPeVif, r1fev1sjuin, peNuit?, rPeNuit?
}
```
Status: `"allowed" | "forbidden" | "release"`

## Season System (lib/season.ts)

### 4 Periods
| Key | Label | Date range |
|-----|-------|-----------|
| `F1FEV_3SMARS` | 1 fév → 3e sam mars | Feb 1 → 3rd Saturday of March |
| `F3SMAS_1SJUIN` | 3e sam mars → 1er sam juin | Day after 3rd Sat Mar → day before 1st Sat Jun |
| `F1SJUIN_30SEP` | 1er sam juin → 30 sep | 1st Saturday of June → Sep 30 |
| `F1OCT_31JANV` | 1 oct → 31 jan | Oct 1 → Jan 31 (crosses year boundary) |

### Fish Groups
| Group | Species |
|-------|---------|
| Groupe 1 (Carnassiers) | Brochet, Sandre, Perche |
| Groupe 2 (Salmonidés) | Truite, Ombre |
| Groupe 3 (Cyprinidés rhéophiles) | Barbeau, Chevaine |
| Groupe 4 (Cyprinidés) | Carpe, Brème, Gardon, Ablette |

Extra individual fish: Vairon, Goujon, Rotengle (Groupe 4), Tanche (Groupe 4)

### ZONE_EAUX-specific rules
- **Calmes**: Meuse, Sambre, canals — lake-like rules (all groups open in winter F1OCT_31JANV)
- **Mixtes**: Semois, Lesse, Ourthe, Amblève — trout rivers (Groupe 3 closed in F1OCT_31JANV)
- **Vives**: Vieille Haine only — fast water, very different rules (winter/early spring closed, late spring has individual fish names not groups)
- **Lacs**: handle separately

### fishInActiveValue(name, groupId, activeValue)
Checks: "Fermé" and "/" → false; individual fish name in value → true; groupId in value → true.

## Zone Sheet Layout
- **Header**: name (truncated), StatusBadge, reason text, tag row (nature, zoneEaux, Privé, fedPech, ☀️ day badge, 🌙 night badge), infoCompl (yellow), remZeaux (⚠️)
- **Season section** (forbidden zones skip): active period banner (green), timeline with "Aujourd'hui" label, individual fish pills (green/red dot per fish)
- **Warning lines**: no-kill alert or live bait allowed
- **Live bait rule button**: PDF or prohibition text (rPeVif)
- **Pike closure button**: PDF (r1fev1sjuin)
- Forbidden zones: header only, no season/fish

## Map UI Elements (z-index stacking)
| Element | z-index |
|---------|---------|
| Tile layer (OSM) | default |
| wmsPane | 450 |
| privatePane | 460 |
| Loading veil | 500 |
| Top bar / GPS / zoom | 600 |
| Sheet backdrop | 1000 |
| Zone action buttons | 1100 |
| Sheet panel | 1001 |
| Species/bait modals | 2000 |
| Legal check overlay | 2000 |

## Private/Restricted Zones
- ~2 zones total: Mehaigne Frayère (`DROIT_PECH=Privé`), Godarville tunnel (`INFO_COMPL=Accès interdit au public`)
- Queried once on init and drawn as orange polygons on `privatePane`
- Orange text tooltip with `.private-tooltip` CSS class
- `Privé` badge shown in zone sheet (no "Public" badge shown)

## Static PDF URLs
- **Species**: 4 PDFs (calmes+mixtes, vives, lacs, Plate Taille) — `ESP_PECH` has zone-specific URLs
- **Identify**: `CLEF_POISSONS` — same URL all zones
- **Live bait**: `R_PE_VIF` — either prohibition text or PDF URL
- **Pike closure**: `R1FEV_1SJUIN` — separate calme/mixte versions
- **Night fishing rules**: `R_PE_NUIT` — PDF for night carp rules

## Known Issues / Edge Cases
- GPS legal check only queries layer 0 (day) — no night fishing check
- "R_PE_VIF" has mixed content: some zones have prohibition text, others have URL
- Legend doesn't show Vives turquoise or Carpe uniquement orange
- WMS `excepté des ponts` restriction only shown as text, no map visual
