import type { ReservationServiceOption } from '@/types/reservation'

export interface ReservationScheduleEntry {
  serviceId: string
  time: string
  durationMinutes: number
}

export interface ReservationSchedulePlan {
  startTime: string
  endTime: string
  entries: ReservationScheduleEntry[]
}

function toMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim())
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null
  }

  return (hours * 60) + minutes
}

function toTimeLabel(totalMinutes: number) {
  const normalized = Math.max(totalMinutes, 0)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`
}

function sortSlots(slots: string[]) {
  return [...slots].sort((left, right) => {
    const leftMinutes = toMinutes(left)
    const rightMinutes = toMinutes(right)

    if (leftMinutes === null || rightMinutes === null) {
      return left.localeCompare(right)
    }

    return leftMinutes - rightMinutes
  })
}

export function buildReservationSchedulePlans(
  serviceIds: string[],
  services: ReservationServiceOption[],
  slotsByServiceId: Record<string, string[]>
) {
  if (serviceIds.length === 0) {
    return [] as ReservationSchedulePlan[]
  }

  const durationByServiceId = new Map(
    services.map(service => [service.id, service.durationMinutes])
  )
  const firstServiceId = serviceIds[0]
  const firstDuration = durationByServiceId.get(firstServiceId)

  if (!firstDuration || firstDuration <= 0) {
    return [] as ReservationSchedulePlan[]
  }

  const firstServiceSlots = sortSlots(slotsByServiceId[firstServiceId] ?? [])
  const plans: ReservationSchedulePlan[] = []

  for (const startTime of firstServiceSlots) {
    const startMinutes = toMinutes(startTime)
    if (startMinutes === null) {
      continue
    }

    const entries: ReservationScheduleEntry[] = [
      {
        serviceId: firstServiceId,
        time: startTime,
        durationMinutes: firstDuration
      }
    ]

    let nextAvailableStart = startMinutes + firstDuration
    let isValidPlan = true

    for (const serviceId of serviceIds.slice(1)) {
      const durationMinutes = durationByServiceId.get(serviceId)
      if (!durationMinutes || durationMinutes <= 0) {
        isValidPlan = false
        break
      }

      const nextSlot = sortSlots(slotsByServiceId[serviceId] ?? []).find(slot => {
        const slotMinutes = toMinutes(slot)
        return slotMinutes !== null && slotMinutes >= nextAvailableStart
      })

      if (!nextSlot) {
        isValidPlan = false
        break
      }

      const nextSlotMinutes = toMinutes(nextSlot)
      if (nextSlotMinutes === null) {
        isValidPlan = false
        break
      }

      entries.push({
        serviceId,
        time: nextSlot,
        durationMinutes
      })
      nextAvailableStart = nextSlotMinutes + durationMinutes
    }

    if (!isValidPlan) {
      continue
    }

    plans.push({
      startTime,
      endTime: toTimeLabel(nextAvailableStart),
      entries
    })
  }

  return plans
}
