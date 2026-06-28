"use client"

import dynamic from "next/dynamic"

const MeuseApp = dynamic(
  () => import("@/components/meuse-app").then((mod) => mod.MeuseApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <img
          src="/ma_peche.png"
          alt=""
          className="size-24 animate-spin rounded-2xl"
        />
        <p className="text-sm font-medium text-foreground/60">Chargement…</p>
      </div>
    ),
  },
)

export default function Page() {
  return <MeuseApp />
}
