export type ZoneStatus = "allowed" | "forbidden" | "release"

export interface FishingZone {
  id: string | number
  name: string
  status: ZoneStatus
  reason: string
  nature: string
  zoneEaux?: string
  fedPech: string
  pechJour: string
  descInt: string
  prelevement: string
  litPrincipal: string
  permisDePeche: string
  espPeche: string
  appatsInterdit: string
  clefPoissons: string
  f1fev3smars: string
  f3smas1sjuin: string
  f1sjuin30sep: string
  f1oct31janv: string
  droitPech: string
  infoCompl: string
  remZeaux: string
  rPeVif: string
  r1fev1sjuin: string
  peNuit?: string
  rPeNuit?: string
}

export const STATUS_META: Record<
  ZoneStatus,
  { label: string; cssVar: string }
> = {
  allowed: { label: "Autorisée", cssVar: "#4a90d9" },
  forbidden: { label: "Interdite", cssVar: "#ff4d4d" },
  release: { label: "No-kill", cssVar: "#ffbb33" },
}

export const ZONE_EAUX_COLORS: Record<string, string> = {
  Calmes: "#0044cc",
  Mixtes: "#0077ee",
  Vives: "#00bb99",
}

export function getZoneColor(zone: FishingZone): string {
  if (zone.status === "forbidden") return STATUS_META.forbidden.cssVar
  if (zone.status === "release") return STATUS_META.release.cssVar
  if (zone.zoneEaux && ZONE_EAUX_COLORS[zone.zoneEaux]) {
    return ZONE_EAUX_COLORS[zone.zoneEaux]
  }
  return STATUS_META.allowed.cssVar
}

export function pechJourSummary(pechJour: string, descInt: string): string {
  const pj = pechJour.toLowerCase()
  if (pj.includes("excepté") || pj.includes("pont")) {
    return "⚠️ Interdit depuis les ponts et passerelles"
  }
  if (pj.includes("interdite")) {
    const d = descInt && descInt !== "/" && descInt !== "-" ? descInt : "Pêche interdite"
    return `🚫 ${d}`
  }
  return pechJour.replace(/^Autorisée,\s*/i, "") || "Autorisée"
}

export function parseWmsFeature(
  props: Record<string, unknown>,
): FishingZone | null {
  const pechJour = ((props.PECH_JOUR as string) || "").toLowerCase()
  const prelevement =
    ((props.PRELEVEMENT as string) || "").toLowerCase()

  let status: ZoneStatus
  if (pechJour.includes("interdite")) {
    status = "forbidden"
  } else if (prelevement === "interdit") {
    status = "release"
  } else {
    status = "allowed"
  }

  const zoneEaux = (props.ZONE_EAUX as string) || undefined
  const name =
    (props.NOM_VH as string) ||
    (props.NOM as string) ||
    "Zone de pêche"
  const nature = props.NATURE as string
  const pechJourLabel = (props.PECH_JOUR as string) || ""
  const desc = (props.DESC_INT as string) || ""

  return {
    id: (props.OBJECTID as number) ?? (props.ID_CARTO as string) ?? 0,
    name,
    status,
    reason: pechJourSummary(pechJourLabel, desc),
    nature: nature && nature !== "/" && nature !== "-" ? nature : "",
    zoneEaux,
    fedPech: (props.FED_PECH as string) || "",
    pechJour: pechJourLabel,
    descInt: desc,
    prelevement: (props.PRELEVEMENT as string) || "",
    litPrincipal: (props.LIT_PRINCIP as string) || "",
    permisDePeche: (props.PERMIS_DE_PECHE as string) || "",
    espPeche: (props.ESP_PECH as string) || "",
    appatsInterdit: (props.APPATS_INTERDIT as string) || "",
    clefPoissons: (props.CLEF_POISSONS as string) || "",
    f1fev3smars: (props.F1FEV_3SMARS as string) || "",
    f3smas1sjuin: (props.F3SMAS_1SJUIN as string) || "",
    f1sjuin30sep: (props.F1SJUIN_30SEP as string) || "",
    f1oct31janv: (props.F1OCT_31JANV as string) || "",
    droitPech: (props.DROIT_PECH as string) || "",
    infoCompl: (props.INFO_COMPL as string) || "",
    remZeaux: (props.REM_ZEAUX as string) || "",
    rPeVif: (props.R_PE_VIF as string) || "",
    r1fev1sjuin: (props.R1FEV_1SJUIN as string) || "",
  }
}

export function mergeNightFishing(
  zone: FishingZone,
  nightProps: Record<string, unknown>,
): FishingZone {
  const peNuit = (nightProps.PE_NUIT as string) || ""
  const rPeNuit = (nightProps.R_PE_NUIT as string) || ""
  return {
    ...zone,
    peNuit: peNuit && peNuit !== "/" ? peNuit : undefined,
    rPeNuit: rPeNuit && rPeNuit !== "/" ? rPeNuit : undefined,
  }
}

export function nightSummary(peNuit?: string): string | null {
  if (!peNuit) return null
  if (peNuit.toLowerCase().includes("interdite")) return "Interdite"
  if (peNuit.toLowerCase().includes("carpe")) return "Carpe uniquement"
  return peNuit
}
