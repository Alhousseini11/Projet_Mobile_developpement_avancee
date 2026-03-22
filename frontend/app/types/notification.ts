export type NotificationType = 'info' | 'success' | 'warning' | 'alert'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  createdAt: Date | string
  read: boolean
}

export function formatNotificationTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Maintenant'
  }

  const now = Date.now()
  const diffMinutes = Math.floor((now - date.getTime()) / 60000)

  if (diffMinutes < 1) {
    return 'Maintenant'
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `Il y a ${diffDays} j`
  }

  return date.toLocaleDateString('fr-FR')
}
