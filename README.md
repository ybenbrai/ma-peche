<div align="center">
  <img src="/ma_peche.png" width="96" height="96" alt="Ma Pêche logo" />
  <h1 align="center">Ma Pêche 🎣</h1>
  <p align="center">
    <strong>Carte interactive des zones de pêche en Wallonie</strong>
    <br />
    Interactive fishing zone map for Wallonia, Belgium
  </p>
  <p align="center">
    <a href="https://ma-peche.vercel.app">Live Demo</a>
    ·
    <a href="https://github.com/ybenbrai/ma-peche/issues">Report Bug</a>
  </p>
</div>

<br />

## ✨ Features

| | |
|---|---|
| 🗺️ **Interactive map** | Leaflet-powered map with official WMS overlay of all fishing zones |
| 🎯 **Zone details** | Click any zone to see status (allowed / no-kill / forbidden), type, rules & more |
| 🐟 **Seasonal species** | See which fish are in season per zone across 4 annual periods |
| 📍 **GPS legal check** | Use your location to instantly check if fishing is allowed where you stand |
| 🔍 **Search** | Nominatim geocoder biased to the Meuse corridor |
| 🚫 **Private zone overlay** | Restricted / private zones highlighted on the map |
| 🌓 **Dark / Light theme** | System-aware, toggleable, remembers your preference |
| 📄 **Official PDFs** | Species identification, bait rules, pike closure schedules |

## 🛠️ Tech Stack

| | |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI** | [React 19](https://react.dev/), TypeScript |
| **Map** | [Leaflet 1.9](https://leafletjs.com/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/), shadcn/ui |
| **Icons** | [Lucide](https://lucide.dev/) |
| **Package manager** | [pnpm](https://pnpm.io/) |

### 📡 Data Sources

- [ArcGIS REST API — Législation Pêche](https://geoservices.wallonie.be/arcgis/rest/services/EAU/LEGIS_PECHE/MapServer) — Wallonia official fishing zone GIS data
- [WMS Tile Service](https://geoservices.wallonie.be/arcgis/services/EAU/LEGIS_PECHE/MapServer/WMSServer) — Rendered fishing zone tiles
- [Nominatim](https://nominatim.openstreetmap.org) — Search geocoding (OpenStreetMap)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+

```bash
npm install -g pnpm
```

### Install & Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

### Production Build

```bash
pnpm build
pnpm start
```

## 🌐 Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ybenbrai/ma-peche)

No environment variables needed — just import and deploy.

## 📁 Project Structure

```
├── app/              # Next.js App Router (layout, page, globals.css)
├── components/       # React components (map, sheet, search, legend, overlays)
├── lib/              # Types, parsers, season logic, utilities
├── public/           # Static assets (icons, logo)
└── .opencode/        # Architecture documentation
```

---

<div align="center">
  <sub>Données indicatives — vérifiez auprès de votre fédération de pêche</sub>
  <br />
  <sub>Data sourced from © Wallonie SPW · Map tiles © OpenStreetMap contributors</sub>
</div>
