/**
 * UI Utilities and Helpers
 * Common UI functions and utilities for the application
 */

/**
 * Show a simple alert dialog
 */
export function showAlert(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    console.log(`${title}: ${message}`)
    // In a real NativeScript app, use:
    // import { showModal, ShowModalOptions, prompt, alert } from '@nativescript/core'
    // alert({ title, message }).then(() => resolve())
    resolve()
  })
}

/**
 * Show a confirmation dialog
 */
export function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Confirm: ${title}: ${message}`)
    // In a real NativeScript app:
    // import { confirm } from '@nativescript/core'
    // confirm({ title, message }).then((result) => resolve(result))
    resolve(true)
  })
}

/**
 * Show a loading indicator
 */
export function showLoading(message: string = 'Chargement...'): void {
  console.log(`Loading: ${message}`)
  // In a real NativeScript app:
  // import { ActivityIndicator } from '@nativescript/core'
  // You can use an ActivityIndicator component
}

/**
 * Hide loading indicator
 */
export function hideLoading(): void {
  console.log('Loading hidden')
}

/**
 * Format a number as currency (EUR)
 */
export function formatCurrency(amount: number): string {
  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const normalized = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2).replace('.', ',')
  return `${normalized} EUR`
}

/**
 * Format a date
 */
export function formatDate(date: Date, format: string = 'short'): string {
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric' }

  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    return new Intl.DateTimeFormat('fr-FR', options).format(date)
  }

  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()

  if (format === 'short') {
    return `${day}/${month}/${year}`
  }

  return `${day}/${month}/${year}`
}

/**
 * Format kilometers with proper separator
 */
export function formatKilometers(km: number): string {
  return km.toLocaleString('fr-FR') + ' km'
}

/**
 * Get vehicle type icon and label
 */
export function getVehicleTypeInfo(type: string): { icon: string; label: string } {
  const typeMap: { [key: string]: { icon: string; label: string } } = {
    sedan: { icon: '🚗', label: 'Berline' },
    suv: { icon: '🏎️', label: 'SUV' },
    truck: { icon: '🚚', label: 'Camion' },
    other: { icon: '🚙', label: 'Autre' }
  }
  return typeMap[type] || { icon: '🚗', label: 'Type inconnu' }
}

/**
 * Get border color class based on vehicle type
 */
export function getVehicleBorderColor(type: string): string {
  const colorMap: { [key: string]: string } = {
    sedan: 'border-red-600',
    suv: 'border-yellow-500',
    truck: 'border-blue-500',
    other: 'border-purple-500'
  }
  return colorMap[type] || 'border-red-600'
}

/**
 * Validate vehicle form data
 */
export function validateVehicleForm(data: {
  name?: string
  model?: string
  year?: number
  mileage?: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name || data.name.trim() === '') {
    errors.push('Le nom du véhicule est requis')
  }

  if (!data.model || data.model.trim() === '') {
    errors.push('Le modèle est requis')
  }

  if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
    errors.push('Année invalide')
  }

  if (data.mileage === undefined || data.mileage < 0) {
    errors.push('Kilométrage invalide')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Navigation helper (will integrate with actual router later)
 */
export class NavigationHelper {
  private static navigationStack: string[] = []

  static push(pageName: string): void {
    this.navigationStack.push(pageName)
    console.log(`Navigating to: ${pageName}`)
  }

  static pop(): string | undefined {
    const page = this.navigationStack.pop()
    console.log(`Going back from: ${page}`)
    return page
  }

  static current(): string | undefined {
    return this.navigationStack[this.navigationStack.length - 1]
  }

  static clear(): void {
    this.navigationStack = []
  }
}

/**
 * Debounce function for event handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: any = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for event handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
