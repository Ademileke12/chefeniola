import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import AdminDashboardPage from '@/app/admin/page'

// Mock the admin components
jest.mock('@/components/admin/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

jest.mock('@/components/admin/MetricCard', () => {
  return function MockMetricCard({ title, value, variant }: any) {
    return (
      <div data-testid="metric-card" data-variant={variant}>
        <span data-testid="metric-title">{title}</span>
        <span data-testid="metric-value">{value}</span>
      </div>
    )
  }
})

jest.mock('@/components/admin/DataTable', () => {
  return function MockDataTable({ title }: any) {
    return <div data-testid="data-table">{title}</div>
  }
})

jest.mock('@/components/admin/InventoryForm', () => {
  return function MockInventoryForm() {
    return <div data-testid="inventory-form">Inventory Form</div>
  }
})

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  DollarSign: () => <div data-testid="dollar-icon" />,
  ShoppingCart: () => <div data-testid="cart-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Download: () => <div data-testid="download-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />
}))

describe('Admin Dashboard Page', () => {
  it('should render dashboard with all required sections', async () => {
    render(<AdminDashboardPage />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    // Check main elements using more specific selectors
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('DOWNLOAD REPORT')).toBeInTheDocument()
  })

  it('should render all required metric cards', async () => {
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    // Check for specific metric cards
    expect(screen.getByText('Revenue Overview')).toBeInTheDocument()
    expect(screen.getByText('Active Orders')).toBeInTheDocument()
    expect(screen.getByText('New Products')).toBeInTheDocument()
  })

  it('should render data tables with correct titles', async () => {
    render(<AdminDashboardPage />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
    
    // Check for data table titles
    expect(screen.getByText('Active Catalogue')).toBeInTheDocument()
    expect(screen.getByText('Order Manifest')).toBeInTheDocument()
  })
})