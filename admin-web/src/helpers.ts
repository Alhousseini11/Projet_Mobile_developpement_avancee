export const DEFAULT_THUMBNAIL = 'https://placehold.co/640x360?text=Garage+Mechanic';

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-CA', {
    dateStyle: 'medium'
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency
  }).format(value);
}

export function splitStringList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  );
}
