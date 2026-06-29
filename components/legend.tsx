const LEGEND_ITEMS = [
  { label: "Calmes", color: "#0044cc" },
  { label: "Mixtes", color: "#0077ee" },
  { label: "Vives", color: "#00bb99" },
  { label: "No-kill", color: "#ffbb33" },
  { label: "Interdite", color: "#ff4d4d" },
]

const OVERLAY_ITEMS = [
  { label: "Privé", borderColor: "#f97316" },
]

export function Legend() {
  return (
    <div className="pointer-events-auto mx-auto w-fit rounded-2xl border border-border bg-card/85 px-5 py-2.5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5" style={{ maxWidth: "200px" }}>
        {[...LEGEND_ITEMS, ...OVERLAY_ITEMS.map(i => ({ label: i.label, color: i.borderColor }))].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <span
              className="size-2 sm:size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="text-[10px] sm:text-[12px] font-medium leading-tight text-foreground/85 whitespace-nowrap">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-0.5 text-center text-[7px] text-black/40 dark:text-white/50">
        Données indicatives — vérifiez auprès de votre fédération
      </p>
      <p className="text-center text-[7px] text-black/30 dark:text-white/40">
        © Wallonie · © OpenStreetMap
      </p>
    </div>
  )
}
