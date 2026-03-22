import type { NotificationItem } from '@/types/notification'
import { apiRequest } from '@/utils/api'

const NOTIFICATIONS_TIMEOUT_MS = 7000

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Rendez-vous confirme',
    message: 'Votre rendez-vous du mardi a 10:00 a bien ete confirme.',
    type: 'success',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    title: 'Entretien recommande',
    message: 'Pensez a verifier vos freins avant votre prochain trajet longue distance.',
    type: 'warning',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false
  },
  {
    id: 'notif-3',
    title: 'Facture disponible',
    message: 'Une nouvelle facture est disponible dans votre espace client.',
    type: 'info',
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    read: true
  }
]

let localNotifications: NotificationItem[] = FALLBACK_NOTIFICATIONS.map(item => ({ ...item }))

function normalizeNotification(raw: any): NotificationItem {
  return {
    id: String(raw?.id ?? `notif-${Math.random().toString(16).slice(2)}`),
    title: String(raw?.title ?? 'Notification'),
    message: String(raw?.message ?? ''),
    type: normalizeType(raw?.type),
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    read: Boolean(raw?.read)
  }
}

function normalizeType(value: unknown): NotificationItem['type'] {
  if (value === 'success' || value === 'warning' || value === 'alert' || value === 'info') {
    return value
  }

  return 'info'
}

class NotificationsService {
  getFallbackNotifications() {
    return localNotifications.map(item => ({ ...item }))
  }

  async getNotifications() {
    try {
      const payload = await apiRequest<any>('/notifications', {
        timeoutMs: NOTIFICATIONS_TIMEOUT_MS
      })

      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.items) ? payload.items : null)

      if (!list) {
        return this.getFallbackNotifications()
      }

      localNotifications = list.map((item: unknown) => normalizeNotification(item))
      return this.getFallbackNotifications()
    } catch (error) {
      console.warn('Error fetching notifications:', error)
      return this.getFallbackNotifications()
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

    localNotifications = next.map(item => ({ ...item }))
    return next
  }

  markAllAsRead(notifications: NotificationItem[]) {
    const next = notifications.map(item => ({
      ...item,
      read: true
    }))

    localNotifications = next.map(item => ({ ...item }))
    return next
  }
}

export default new NotificationsService()
