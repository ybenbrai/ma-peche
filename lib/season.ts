export interface SeasonPeriod {
  key: string
  label: string
  start: Date
  end: Date
}

export interface FishGroup {
  id: string
  name: string
  species: string[]
}

export const FISH_GROUPS: FishGroup[] = [
  { id: "Groupe 1", name: "Carnassiers", species: ["Brochet", "Sandre", "Perche"] },
  { id: "Groupe 2", name: "Salmonidés", species: ["Truite", "Ombre"] },
  { id: "Groupe 3", name: "Cyprinidés rhéophiles", species: ["Barbeau", "Chevaine"] },
  { id: "Groupe 4", name: "Cyprinidés", species: ["Carpe", "Brème", "Gardon", "Ablette"] },
]

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d)
    if (date.getMonth() !== month) break
    if (date.getDay() === weekday) {
      count++
      if (count === n) return date
    }
  }
  return new Date(year, month, 1)
}

function firstWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  return nthWeekdayOfMonth(year, month, weekday, 1)
}

export function getSeasonPeriods(year: number): SeasonPeriod[] {
  const thirdSatMar = nthWeekdayOfMonth(year, 2, 6, 3)
  const firstSatJun = firstWeekdayOfMonth(year, 5, 6)

  return [
    {
      key: "F1FEV_3SMARS",
      label: "1 fév → 3e sam mars",
      start: new Date(year, 1, 1),
      end: new Date(thirdSatMar),
    },
    {
      key: "F3SMAS_1SJUIN",
      label: "3e sam mars → 1er sam juin",
      start: new Date(thirdSatMar.getTime() + 86400000),
      end: new Date(firstSatJun.getTime() - 86400000),
    },
    {
      key: "F1SJUIN_30SEP",
      label: "1er sam juin → 30 sep",
      start: new Date(firstSatJun),
      end: new Date(year, 8, 30),
    },
    {
      key: "F1OCT_31JANV",
      label: "1 oct → 31 jan",
      start: new Date(year, 9, 1),
      end: new Date(year + 1, 0, 31),
    },
  ]
}

export function getActiveSeason(
  periods: SeasonPeriod[],
  today: Date,
): SeasonPeriod | undefined {
  const ts = today.getTime()
  for (const p of periods) {
    if (ts >= p.start.getTime() && ts <= p.end.getTime()) {
      return p
    }
  }
  // fallback: check across year boundary (F1OCT_31JANV crosses into next year)
  const octToJan = periods.find((p) => p.key === "F1OCT_31JANV")
  if (octToJan && ts >= octToJan.start.getTime()) return octToJan
  return undefined
}

export function getActiveFieldValue(
  activePeriod: SeasonPeriod | undefined,
  zone: {
    f1fev3smars: string
    f3smas1sjuin: string
    f1sjuin30sep: string
    f1oct31janv: string
  },
): string {
  if (!activePeriod) return ""
  const map: Record<string, string> = {
    F1FEV_3SMARS: zone.f1fev3smars,
    F3SMAS_1SJUIN: zone.f3smas1sjuin,
    F1SJUIN_30SEP: zone.f1sjuin30sep,
    F1OCT_31JANV: zone.f1oct31janv,
  }
  return map[activePeriod.key] || ""
}

const CLOSED_VALUES = new Set(["fermé", "/", ""])

export function fishInActiveValue(
  name: string,
  groupId: string | undefined,
  activeValue: string,
): boolean {
  const val = activeValue.trim().toLowerCase()
  if (CLOSED_VALUES.has(val)) return false
  if (val.includes(name.toLowerCase())) return true
  if (groupId && val.includes(groupId.toLowerCase())) return true
  return false
}

export { fishInActiveValue as groupInActiveValue }

export function getTimelinePosition(today: Date, year: number): number {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year, 11, 31).getTime()
  const clamped = Math.max(start, Math.min(today.getTime(), end))
  return ((clamped - start) / (end - start)) * 100
}

export function seasonLabel(key: string): string {
  const labels: Record<string, string> = {
    F1FEV_3SMARS: "1 fév → 3e sam mars",
    F3SMAS_1SJUIN: "3e sam mars → 1er sam juin",
    F1SJUIN_30SEP: "1er sam juin → 30 sep",
    F1OCT_31JANV: "1 oct → 31 jan",
  }
  return labels[key] || key
}
