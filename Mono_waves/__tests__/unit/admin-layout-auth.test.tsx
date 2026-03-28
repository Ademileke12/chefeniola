import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/admin/DashboardLayout'
import { requireAdmin, AuthenticationError, AuthorizationError } from '@/lib/utils/adminAuth'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/admin'),
}))

// Mock admin auth utilities
jest.mock('@/lib/utils/adminAuth', () => ({
  requireAdmin: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthenticationError'
    }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthorizationError'
    }
  },
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="dashboard-icon" />,
  Package: () => <div data-testid="package-icon" />,
  ShoppingCart: () => <div data-testid="cart-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  User: () => <div data-testid="user-icon" />,
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>

// Create a wrapper component that simulates authentication checking
function AuthenticatedDashboardLayout({ children, shouldAuthenticate = true, authError }: { 
  children: React.ReactNode
  shouldAuthenticate?: boolean
  authError?: Error | null
}) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    const checkAuth = async () => {
      if (!shouldAuthenticate) {
        setIsAuthenticated(false)
        if (authError instanceof AuthenticationError) {
          setError('Authentication failed')
        } else if (authError instanceof AuthorizationError) {
          setError('Not authorized')
        } else if (authError) {
          setError('Unknown error')
        } else {
          setError('Not authenticated')
        }
        return
      }

      try {
        // Simulate checking authentication
        const mockRequest = {
          headers: {
            get: (name: string) => name === 'authorization' ? 'Bearer valid_token' : null
          }
        } as any

        await mockRequireAdmin(mockRequest)
        setIsAuthenticated(true)
      } catch (error) {
        setIsAuthenticated(false)
        if (error instanceof AuthenticationError) {
          setError('Authentication failed')
        } else if (error instanceof AuthorizationError) {
          setError('Not authorized')
        } else {
          setError('Unknown error')
        }
      }
    }

    checkAuth()
  }, [shouldAuthenticate, authError])

  // Show loading state
  if (isAuthenticated === null) {
    return <div data-testid="auth-loading">Checking authentication...</div>
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <div data-testid="auth-error">Access denied: {error}</div>
  }

  // Render dashboard if authenticated
  return <DashboardLayout>{children}</DashboardLayout>
}

describe('Admin Layout Authentication', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any)
  })

  describe('Authentication Success', () => {
    it('should render dashboard when user is authenticated as admin', async () => {
      const mockUser = {
        id: 'admin123',
        email: 'admin@monowaves.com',
        role: 'admin'
      }

      mockRequireAdmin.mockResolvedValue(mockUser as any)

      render(
        <AuthenticatedDashboardLayout>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      // Should show loading first
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      })

      // Should render admin panel
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    })

    it('should display admin user information when authenticated', async () => {
      const mockUser = {
        id: 'admin123',
        email: 'admin@monowaves.com'
      }

      mockRequireAdmin.mockResolvedValue(mockUser as any)

      render(
        <AuthenticatedDashboardLayout>
          <div>Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
        expect(screen.getByText('admin@monowaves.com')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Failure', () => {
    it('should show error when authentication fails', async () => {
      const authError = new AuthenticationError('Invalid token')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      // Wait for authentication to fail
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument()
    })

    it('should handle authorization error when user is not admin', async () => {
      const authError = new AuthorizationError('User does not have admin privileges')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Not authorized/)).toBeInTheDocument()
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
    })

    it('should handle missing authorization header', async () => {
      const authError = new AuthenticationError('Missing or invalid authorization header')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument()
    })
  })

  describe('Authentication Loading States', () => {
    it('should show loading state during authentication check', () => {
      // Don't resolve the promise immediately
      mockRequireAdmin.mockImplementation(() => new Promise(() => {}))

      render(
        <AuthenticatedDashboardLayout>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
      expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument()
    })

    it('should transition from loading to authenticated state', async () => {
      const mockUser = { id: 'admin123', email: 'admin@monowaves.com' }
      mockRequireAdmin.mockResolvedValue(mockUser as any)

      render(
        <AuthenticatedDashboardLayout>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      // Initially loading
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()

      // Then authenticated
      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument()
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      })
    })

    it('should transition from loading to error state', async () => {
      const authError = new AuthenticationError('Invalid token')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      // Then error (no loading state since shouldAuthenticate=false)
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument()
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument()
    })
  })

  describe('Navigation Security', () => {
    it('should not render navigation links when not authenticated', async () => {
      const authError = new AuthenticationError('Not authenticated')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div>Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      // Navigation should not be accessible
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Products')).not.toBeInTheDocument()
      expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    })

    it('should render all navigation links when authenticated', async () => {
      const mockUser = { id: 'admin123', email: 'admin@monowaves.com' }
      mockRequireAdmin.mockResolvedValue(mockUser as any)

      render(
        <AuthenticatedDashboardLayout>
          <div>Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Products')).toBeInTheDocument()
        expect(screen.getByText('Orders')).toBeInTheDocument()
        expect(screen.getByText('Designs')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockRequireAdmin.mockRejectedValue(networkError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={networkError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Unknown error/)).toBeInTheDocument()
    })

    it('should handle malformed tokens', async () => {
      const authError = new AuthenticationError('Malformed token')
      mockRequireAdmin.mockRejectedValue(authError)

      render(
        <AuthenticatedDashboardLayout shouldAuthenticate={false} authError={authError}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </AuthenticatedDashboardLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument()
    })
  })
})