import type { NotificationDateContext, NotificationItem } from '@/types/notification'
import { apiRequest } from '@/utils/api'

const NOTIFICATIONS_TIMEOUT_MS = 7000

let localNotifications: NotificationItem[] = []

function cloneNotifications(notifications: NotificationItem[]) {
  return notifications.map(item => ({
    ...item,
    dateContext: item.dateContext ? { ...item.dateContext } : null
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeIsoDate(value: unknown, context: string) {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) {
    console.warn(`[Notifications] Invalid date for ${context}:`, value)
    return null
  }

  return date.toISOString()
}

function normalizeType(value: unknown): NotificationItem['type'] {
  if (value === 'success' || value === 'warning' || value === 'alert' || value === 'info') {
    return value
  }

  return 'info'
}

function normalizeDateContext(raw: unknown, notificationId: string): NotificationDateContext | null {
  if (!isRecord(raw)) {
    return null
  }

  const kind = raw.kind

  if (kind !== 'appointment' && kind !== 'reminder' && kind !== 'update') {
    return null
  }

  const at = normalizeIsoDate(raw.at, `dateContext.at (${notificationId})`)

  if (!at) {
    return null
  }

  return {
    kind,
    at
  }
}

function normalizeNotification(raw: unknown): NotificationItem | null {
  if (!isRecord(raw)) {
    console.warn('[Notifications] Invalid notification payload:', raw)
    return null
  }

  const id = String(raw.id ?? `notif-${Math.random().toString(16).slice(2)}`)
  const createdAt = normalizeIsoDate(raw.createdAt, `createdAt (${id})`)

  if (!createdAt) {
    return null
  }

  return {
    id,
    title: String(raw.title ?? 'Notification'),
    message: String(raw.message ?? ''),
    type: normalizeType(raw.type),
    createdAt,
    read: Boolean(raw.read),
    dateContext: normalizeDateContext(raw.dateContext, id)
  }
}

function sortNotifications(notifications: NotificationItem[]) {
  return [...notifications].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function normalizeNotificationList(payload: unknown) {
  const list = Array.isArray(payload)
    ? payload
    : (isRecord(payload) && Array.isArray(payload.items) ? payload.items : null)

  if (!list) {
    return null
  }

  return list
    .map(item => normalizeNotification(item))
    .filter((item): item is NotificationItem => item !== null)
}

function isUnauthorizedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes('401') || error.message.includes('Authentification requise')
}

export function resetNotificationsCache() {
  localNotifications = []
}

class NotificationsService {
  getCachedNotifications() {
    return cloneNotifications(localNotifications)
  }

  async getNotifications() {
    try {
      const payload = await apiRequest<unknown>('/notifications', {
        timeoutMs: NOTIFICATIONS_TIMEOUT_MS
      })

      const normalized = normalizeNotificationList(payload)

      if (!normalized) {
        console.warn('[Notifications] Unexpected payload shape:', payload)
        return this.getCachedNotifications()
      }

      localNotifications = sortNotifications(normalized)
      return this.getCachedNotifications()
    } catch (error) {
      if (isUnauthorizedError(error)) {
        resetNotificationsCache()
        return []
      }

      console.warn('Error fetching notifications:', error)
      return this.getCachedNotifications()
    }
  }

  markAsRead(notifications: NotificationItem[], notificationId: string) {
    const next = notifications.map(item => {
      if (item.id !== notificationId) {
        return item
      }

      return {
        ...item,
        read: true
      }
    })

    localNotifications = cloneNotifications(next)
    return next
  }

  markAllAsRead(notifications: NotificationItem[]) {
    const next = notifications.map(item => ({
      ...item,
      read: true
    }))

    localNotifications = cloneNotifications(next)
    return next
  }
}

export default new NotificationsService()
