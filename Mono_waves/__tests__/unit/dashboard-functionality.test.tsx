import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, jest } from '@jest/globals'
import AdminDashboardPage from '@/app/admin/page'

// Mock components
jest.mock('@/components/admin/DashboardLayout', () => 
  ({ children }: { children: React.ReactNode }) => <div>{children}</div>
)

jest.mock('@/components/admin/MetricCard', () => 
  ({ title, value }: any) => (
    <div data-testid="metric-card">
      <span>{title}: {value}</span>
    </div>
  )
)

jest.mock('@/components/admin/DataTable', () => 
  ({ title }: any) => <div data-testid="data-table">{title}</div>
)

jest.mock('@/components/admin/InventoryForm', () => 
  ({ onSubmit }: any) => (
    <button onClick={() => onSubmit?.({ test: 'data' })}>
      Inventory Form
    </button>
  )
)

jest.mock('lucide-react', () => ({
  DollarSign: () => <div />,
  ShoppingCart: () => <div />,
  Package: () => <div />,
  Download: () => <div />,
  TrendingUp: () => <div />,
  Eye: () => <div />,
  Edit: () => <div />,
  Trash2: () => <div />
}))

describe('Dashboard Functionality Tests', () => {
  it('should render all metric cards with correct values', async () => {
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('Revenue Overview: 142,890')).toBeInTheDocument()
    expect(screen.getByText('Active Orders: 1,284')).toBeInTheDocument()
    expect(screen.getByText('New Products: 48')).toBeInTheDocument()
  })

  it('should render data tables', async () => {
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('Active Catalogue')).toBeInTheDocument()
    expect(screen.getByText('Order Manifest')).toBeInTheDocument()
  })

  it('should handle download report click', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const user = userEvent.setup()
    
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    await user.click(screen.getByText('DOWNLOAD REPORT'))
    
    expect(consoleSpy).toHaveBeenCalledWith('Download report clicked')
    consoleSpy.mockRestore()
  })

  it('should handle inventory form submission', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const user = userEvent.setup()
    
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Inventory Form'))
    
    expect(consoleSpy).toHaveBeenCalledWith('Inventory entry:', { test: 'data' })
    consoleSpy.mockRestore()
  })
})