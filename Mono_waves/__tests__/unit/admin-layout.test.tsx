import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/admin/Sidebar'
import DashboardLayout from '@/components/admin/DashboardLayout'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  LayoutDashboard: ({ className }: { className?: string }) => <div data-testid="dashboard-icon" className={className} />,
  Package: ({ className }: { className?: string }) => <div data-testid="package-icon" className={className} />,
  ShoppingCart: ({ className }: { className?: string }) => <div data-testid="cart-icon" className={className} />,
  Palette: ({ className }: { className?: string }) => <div data-testid="palette-icon" className={className} />,
  Settings: ({ className }: { className?: string }) => <div data-testid="settings-icon" className={className} />,
  User: ({ className }: { className?: string }) => <div data-testid="user-icon" className={className} />,
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('Admin Layout Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Sidebar Component', () => {
    it('should render admin panel header', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    })

    it('should render all navigation items', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      // Check all navigation items are present
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Designs')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render navigation icons', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      // Check all icons are present
      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument()
      expect(screen.getByTestId('package-icon')).toBeInTheDocument()
      expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
      expect(screen.getByTestId('palette-icon')).toBeInTheDocument()
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    })

    it('should highlight active navigation item based on pathname', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      
      render(<Sidebar />)
      
      const productsLink = screen.getByRole('link', { name: /products/i })
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      
      // Products should be active (has bg-gray-800 class)
      expect(productsLink).toHaveClass('bg-gray-800', 'text-white')
      
      // Dashboard should not be active (has text-gray-400 class)
      expect(dashboardLink).toHaveClass('text-gray-400')
    })

    it('should highlight active navigation item based on activeSection prop', () => {
      mockUsePathname.mockReturnValue('/admin/some-other-page')
      
      render(<Sidebar activeSection="orders" />)
      
      const ordersLink = screen.getByRole('link', { name: /orders/i })
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      
      // Orders should be active due to activeSection prop
      expect(ordersLink).toHaveClass('bg-gray-800', 'text-white')
      
      // Dashboard should not be active (pathname doesn't match and activeSection is different)
      expect(dashboardLink).toHaveClass('text-gray-400')
    })

    it('should render correct navigation links', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      // Check all links have correct href attributes
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin')
      expect(screen.getByRole('link', { name: /products/i })).toHaveAttribute('href', '/admin/products')
      expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/admin/orders')
      expect(screen.getByRole('link', { name: /designs/i })).toHaveAttribute('href', '/admin/designs')
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/admin/settings')
    })

    it('should render admin user profile section', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      // Check user profile elements
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin@monowaves.com')).toBeInTheDocument()
      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    })

    it('should apply correct CSS classes for layout', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      const { container } = render(<Sidebar />)
      const sidebar = container.firstChild as HTMLElement
      
      // Check sidebar has correct positioning and styling classes
      expect(sidebar).toHaveClass('fixed', 'left-0', 'top-0', 'h-screen', 'w-64', 'bg-gray-900', 'text-white')
    })
  })

  describe('DashboardLayout Component', () => {
    it('should render children content', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(
        <DashboardLayout>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      )
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render sidebar component', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      )
      
      // Sidebar should be present
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should pass activeSection prop to sidebar', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(
        <DashboardLayout activeSection="products">
          <div>Content</div>
        </DashboardLayout>
      )
      
      const productsLink = screen.getByRole('link', { name: /products/i })
      
      // Products should be active due to activeSection prop
      expect(productsLink).toHaveClass('bg-gray-800', 'text-white')
    })

    it('should apply correct layout structure', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      const { container } = render(
        <DashboardLayout>
          <div data-testid="content">Content</div>
        </DashboardLayout>
      )
      
      const layout = container.firstChild as HTMLElement
      const main = screen.getByRole('main')
      
      // Check layout structure
      expect(layout).toHaveClass('min-h-screen', 'bg-gray-50')
      expect(main).toHaveClass('ml-64', 'min-h-screen')
      
      // Check content wrapper
      const contentWrapper = main.firstChild as HTMLElement
      expect(contentWrapper).toHaveClass('p-8')
    })

    it('should render multiple children correctly', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(
        <DashboardLayout>
          <h1>Page Title</h1>
          <div>Page Content</div>
          <button>Action Button</button>
        </DashboardLayout>
      )
      
      expect(screen.getByText('Page Title')).toBeInTheDocument()
      expect(screen.getByText('Page Content')).toBeInTheDocument()
      expect(screen.getByText('Action Button')).toBeInTheDocument()
    })
  })

  describe('Navigation Integration', () => {
    it('should handle dashboard route correctly', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('bg-gray-800', 'text-white')
    })

    it('should handle nested admin routes correctly', () => {
      mockUsePathname.mockReturnValue('/admin/products/create')
      
      render(<Sidebar />)
      
      // Products should still be active for nested routes
      const productsLink = screen.getByRole('link', { name: /products/i })
      expect(productsLink).toHaveClass('text-gray-400') // Not active since exact match is required
    })

    it('should handle non-admin routes correctly', () => {
      mockUsePathname.mockReturnValue('/storefront')
      
      render(<Sidebar />)
      
      // No navigation items should be active
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      const productsLink = screen.getByRole('link', { name: /products/i })
      
      expect(dashboardLink).toHaveClass('text-gray-400')
      expect(productsLink).toHaveClass('text-gray-400')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      )
      
      // Check semantic elements
      expect(screen.getByRole('complementary')).toBeInTheDocument() // aside element
      expect(screen.getByRole('main')).toBeInTheDocument() // main element
      expect(screen.getByRole('navigation')).toBeInTheDocument() // nav element
    })

    it('should have accessible navigation links', () => {
      mockUsePathname.mockReturnValue('/admin')
      
      render(<Sidebar />)
      
      // All navigation links should be accessible
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(5) // 5 navigation items
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
        expect(link).toBeVisible()
      })
    })
  })
})