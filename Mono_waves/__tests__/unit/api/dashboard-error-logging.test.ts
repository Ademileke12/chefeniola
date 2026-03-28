/**
 * Unit Tests: Dashboard API Error Logging
 * 
 * Tests that verify all errors are properly logged for debugging purposes.
 * 
 * Task: 1.4 - Log errors for debugging
 * Requirements: 5.4, 5.5
 * 
 * Validates:
 * - All query errors are logged with console.error
 * - Error messages include sufficient context for debugging
 * - Partial success scenarios are logged with console.warn
 * - Critical errors in catch block are logged
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/dashboard/route'
import { supabaseAdmin } from '@/lib/supabase/server'

// Mock Supabase admin client
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

function createRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Dashboard API Error Logging', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Query Error Logging', () => {
    it('should log orders metrics query errors with console.error', async () => {
      const ordersError = { message: 'Orders metrics query failed', code: 'DB_ERROR' }
      
      const mockFrom = jest.fn()
      
      // Orders metrics query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: ordersError })
      })
      
      // Recent orders query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      // Products query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })
      
      // Products count succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.error was called with proper context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Orders metrics query error:', ordersError)
    })

    it('should log recent orders query errors with console.error', async () => {
      const recentOrdersError = { message: 'Recent orders query failed', code: 'TIMEOUT' }
      
      const mockFrom = jest.fn()
      
      // Orders metrics query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      })
      
      // Recent orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: recentOrdersError })
          })
        })
      })
      
      // Products query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })
      
      // Products count succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.error was called with proper context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Recent orders query error:', recentOrdersError)
    })

    it('should log products query errors with console.error', async () => {
      const productsError = { message: 'Products query failed', code: 'CONNECTION_ERROR' }
      
      const mockFrom = jest.fn()
      
      // Orders queries succeed
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      })
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      // Products query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: productsError })
            })
          })
        })
      })
      
      // Products count succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.error was called with proper context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Products query error:', productsError)
    })

    it('should log products count query errors with console.error', async () => {
      const productsCountError = { message: 'Products count query failed', code: 'PERMISSION_DENIED' }
      
      const mockFrom = jest.fn()
      
      // Orders queries succeed
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      })
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      // Products query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })
      
      // Products count fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: null, error: productsCountError })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.error was called with proper context
      expect(consoleErrorSpy).toHaveBeenCalledWith('Products count query error:', productsCountError)
    })

    it('should log all query errors when multiple queries fail', async () => {
      const ordersError = { message: 'Orders failed' }
      const productsError = { message: 'Products failed' }
      
      const mockFrom = jest.fn()
      
      // Orders metrics query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: ordersError })
      })
      
      // Recent orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: ordersError })
          })
        })
      })
      
      // Products query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: productsError })
            })
          })
        })
      })
      
      // Products count fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: null, error: productsError })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify all errors were logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Orders metrics query error:', ordersError)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Recent orders query error:', ordersError)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Products query error:', productsError)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Products count query error:', productsError)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(4)
    })
  })

  describe('Partial Success Logging', () => {
    it('should log partial success with console.warn when some queries fail', async () => {
      const ordersError = { message: 'Orders query failed' }
      
      const mockFrom = jest.fn()
      
      // Orders metrics query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: ordersError })
      })
      
      // Recent orders query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      // Products query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })
      
      // Products count succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.warn was called for partial success
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Dashboard API completed with errors:',
        expect.arrayContaining([expect.stringContaining('Failed to fetch orders metrics')])
      )
    })

    it('should include all error messages in console.warn for partial success', async () => {
      const ordersError = { message: 'Orders failed' }
      const productsError = { message: 'Products failed' }
      
      const mockFrom = jest.fn()
      
      // Orders metrics query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: ordersError })
      })
      
      // Recent orders query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      // Products query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: productsError })
            })
          })
        })
      })
      
      // Products count succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify console.warn includes all errors
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Dashboard API completed with errors:',
        expect.arrayContaining([
          expect.stringContaining('Failed to fetch orders metrics'),
          expect.stringContaining('Failed to fetch products')
        ])
      )
    })
  })

  describe('Critical Error Logging', () => {
    it('should log critical errors in catch block with console.error', async () => {
      const criticalError = new Error('Unexpected database failure')
      
      // Mock supabaseAdmin.from to throw an error
      jest.mocked(supabaseAdmin).from = jest.fn().mockImplementation(() => {
        throw criticalError
      })

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify critical error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Critical error in dashboard API:', criticalError)
    })

    it('should log critical errors with full error object for debugging', async () => {
      const criticalError = new TypeError('Cannot read property of undefined')
      criticalError.stack = 'Error stack trace...'
      
      jest.mocked(supabaseAdmin).from = jest.fn().mockImplementation(() => {
        throw criticalError
      })

      await GET(createRequest('http://localhost:3000/api/admin/dashboard'))

      // Verify the full error object is logged (not just the message)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Critical error in dashboard API:', criticalError)
      
      // Verify the logged error includes stack trace
      const loggedError = consoleErrorSpy.mock.calls[0][1]
      expect(loggedError).toBe(criticalError)
      expect((loggedError as Error).stack).toBeDefined()
    })
  })

  describe('Error Context Validation', () => {
    it('should include sufficient context in error messages', async () => {
      const ordersError = { 
        message: 'Connection timeout',
        code: 'TIMEOUT',
        details: 'Database connection timed out after 30s'
      }
      
      const mockFrom = jest.fn()
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: null, error: ordersError })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const response = await GET(createRequest('http://localhost:3000/api/admin/dashboard'))
      const data = await response.json()

      // Verify error log includes query identifier
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Orders metrics query error'),
        ordersError
      )
      
      // Verify response includes user-friendly error message with context
      expect(data.errors).toContain('Failed to fetch orders metrics: Connection timeout')
    })
  })
})
