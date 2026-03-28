import { requireAdmin, getAuthenticatedUser, AuthenticationError, AuthorizationError } from '@/lib/utils/adminAuth'
import { supabaseAdmin } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
  },
}))

// Helper to create mock NextRequest
function createMockRequest(url: string, headers: Record<string, string> = {}) {
  return {
    url,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as any
}

describe('Admin Authentication Utilities', () => {
  const mockGetUser = supabaseAdmin.auth.getUser as jest.MockedFunction<typeof supabaseAdmin.auth.getUser>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_EMAIL = 'admin@monowaves.com'
  })

  describe('requireAdmin', () => {
    it('should throw AuthenticationError when authorization header is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/test')

      await expect(requireAdmin(request)).rejects.toThrow(AuthenticationError)
      await expect(requireAdmin(request)).rejects.toThrow('Missing or invalid authorization header')
    })

    it('should throw AuthenticationError when authorization header is invalid', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/test', {
        authorization: 'InvalidFormat token123',
      })

      await expect(requireAdmin(request)).rejects.toThrow(AuthenticationError)
    })

    it('should throw AuthenticationError when token is invalid', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      } as any)

      const request = createMockRequest('http://localhost:3000/api/admin/test', {
        authorization: 'Bearer invalid_token',
      })

      await expect(requireAdmin(request)).rejects.toThrow(AuthenticationError)
    })

    it('should throw AuthorizationError when user is not admin', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user123',
            email: 'user@example.com',
          },
        },
        error: null,
      } as any)

      const request = createMockRequest('http://localhost:3000/api/admin/test', {
        authorization: 'Bearer valid_token',
      })

      await expect(requireAdmin(request)).rejects.toThrow(AuthorizationError)
      await expect(requireAdmin(request)).rejects.toThrow('User does not have admin privileges')
    })

    it('should return user when authenticated as admin', async () => {
      const mockUser = {
        id: 'admin123',
        email: 'admin@monowaves.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const request = createMockRequest('http://localhost:3000/api/admin/test', {
        authorization: 'Bearer valid_admin_token',
      })

      const user = await requireAdmin(request)
      expect(user).toEqual(mockUser)
    })
  })

  describe('getAuthenticatedUser', () => {
    it('should return null when authorization header is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/test')

      const user = await getAuthenticatedUser(request)
      expect(user).toBeNull()
    })

    it('should return null when token is invalid', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      } as any)

      const request = createMockRequest('http://localhost:3000/api/test', {
        authorization: 'Bearer invalid_token',
      })

      const user = await getAuthenticatedUser(request)
      expect(user).toBeNull()
    })

    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any)

      const request = createMockRequest('http://localhost:3000/api/test', {
        authorization: 'Bearer valid_token',
      })

      const user = await getAuthenticatedUser(request)
      expect(user).toEqual(mockUser)
    })
  })
})
