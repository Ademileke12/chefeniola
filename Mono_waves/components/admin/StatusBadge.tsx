/**
 * StatusBadge Component
 * 
 * Displays product availability status with appropriate styling.
 * Used in admin product catalog to show product status at a glance.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { AvailabilityStatus } from '@/lib/services/catalogService'

interface StatusBadgeProps {
  status: AvailabilityStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  // Define styles for each status
  const styles: Record<AvailabilityStatus, string> = {
    new: 'bg-blue-100 text-blue-800 border-blue-300',
    available: 'bg-green-100 text-green-800 border-green-300',
    out_of_stock: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    discontinued: 'bg-red-100 text-red-800 border-red-300 opacity-60'
  }

  // Define labels for each status
  const labels: Record<AvailabilityStatus, string> = {
    new: 'New',
    available: 'Available',
    out_of_stock: 'Out of Stock',
    discontinued: 'Discontinued'
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${styles[status]} ${className}`}
      data-status={status}
    >
      {labels[status]}
    </span>
  )
}
