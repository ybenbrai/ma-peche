# Ma Pêche 🎣

Interactive map of fishing zones in **Wallonia, Belgium** — powered by official open data from the [Wallonia Public Service (SPW)](https://geoservices.wallonie.be).

Browse fishing zones, check your GPS location against regulations, view species per season, and access official PDF rulebooks — all in one place.

## Features

- **Interactive map** — Leaflet-powered map with WMS overlay of all fishing zones
- **Zone details** — Click any zone to see its status (allowed / no-kill / forbidden), zone type (_Calmes, Mixtes, Vives_), day & night fishing rules, and more
- **Seasonal species** — See which fish are in season for each zone across 4 periods
- **GPS legal check** — Drop a pin or use your location to instantly check if fishing is allowed
- **Search** — Nominatim geocoder biased to the Meuse corridor
- **Private zone overlay** — Restricted/private zones highlighted on the map
- **Dark theme** — Forced dark mode with inverted OSM tiles

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Framework |
| **React 19** | UI library |
| **Leaflet 1.9** | Interactive map |
| **Tailwind CSS v4** | Styling |
| **TypeScript** | Language |
| **shadcn/ui** | Component primitives |
| **Lucide** | Icons |
| **pnpm** | Package manager |

### Data Sources

- [ArcGIS REST API — Législation Pêche](https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer) — Wallonia official fishing zone GIS data
- [WMS Tile Service](https://geoservices.wallonie.be/arcgis/services/EAU/LEGIS_PECHE/MapServer/WMSServer) — Rendered fishing zone tiles
- [Nominatim](https://nominatim.openstreetmap.org) — Search geocoding (OpenStreetMap)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

```bash
# Install pnpm if you don't have it
npm install -g pnpm
```

### Install

```bash
pnpm install
```

### Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
pnpm build
pnpm start
```

## Deploy on Vercel

This project is ready for Vercel deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ybenbrai/ma-peche)

Or deploy manually:

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel auto-detects Next.js — no configuration needed
4. Deploy!

### Environment Variables

No environment variables are required.
