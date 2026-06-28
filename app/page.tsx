"use client"

import dynamic from "next/dynamic"

const MeuseApp = dynamic(
  () => import("@/components/meuse-app").then((mod) => mod.MeuseApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    ),
  },
)

export default function Page() {
  return <MeuseApp />
}
