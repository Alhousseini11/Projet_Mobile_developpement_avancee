export type NotificationType = 'info' | 'success' | 'warning' | 'alert'
export type NotificationDateContextKind = 'appointment' | 'reminder' | 'update'

export interface NotificationDateContext {
  kind: NotificationDateContextKind
  at: Date | string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  createdAt: Date | string
  read: boolean
  dateContext: NotificationDateContext | null
}

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatAbsoluteDateTime(date: Date): string {
  return date.toLocaleString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatAbsoluteDate(date: Date): string {
  return date.toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatNotificationDateContext(value: NotificationDateContext | null): string {
  if (!value) {
    return ''
  }

  const date = toValidDate(value.at)

  if (!date) {
    return ''
  }

  if (value.kind === 'appointment') {
    return `Prevu le ${formatAbsoluteDateTime(date)}`
  }

  if (value.kind === 'reminder') {
    return `Echeance le ${formatAbsoluteDate(date)}`
  }

  return `Mis a jour le ${formatAbsoluteDateTime(date)}`
}

export function formatNotificationTime(value: Date | string): string {
  const date = toValidDate(value)

  if (!date) {
    return 'Date inconnue'
  }

  const now = Date.now()
  const diffMinutes = Math.floor((now - date.getTime()) / 60000)

  if (diffMinutes < 0) {
    return formatAbsoluteDateTime(date)
  }

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

  return formatAbsoluteDate(date)
}
