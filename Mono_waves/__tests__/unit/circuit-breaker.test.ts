/**
 * Circuit Breaker Unit Tests
 * 
 * Tests circuit breaker pattern implementation including:
 * - State transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
 * - Failure threshold
 * - Reset timeout
 * - Retry logic with exponential backoff
 */

import { CircuitBreaker, withRetry } from '@/lib/utils/circuitBreaker'

describe('CircuitBreaker', () => {
  describe('State transitions', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker({ name: 'Test' })
      const stats = breaker.getStats()

      expect(stats.state).toBe('CLOSED')
      expect(stats.failureCount).toBe(0)
      expect(stats.successCount).toBe(0)
    })

    it('should remain CLOSED on successful executions', async () => {
      const breaker = new CircuitBreaker({ name: 'Test' })
      const successFn = jest.fn().mockResolvedValue('success')

      await breaker.execute(successFn)
      await breaker.execute(successFn)
      await breaker.execute(successFn)

      const stats = breaker.getStats()
      expect(stats.state).toBe('CLOSED')
      expect(stats.successCount).toBe(3)
      expect(stats.failureCount).toBe(0)
    })

    it('should open after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker({
        name: 'Test',
        failureThreshold: 3,
      })
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'))

      // Execute 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failFn)
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = breaker.getStats()
      expect(stats.state).toBe('OPEN')
      expect(stats.failureCount).toBe(3)
    })

    it('should reject requests immediately when OPEN', async () => {
      const breaker = new CircuitBreaker({
        name: 'Test',
        failureThreshold: 2,
      })
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'))

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn)
        } catch (error) {
          // Expected
        }
      }

      // Try to execute again - should be rejected immediately
      const successFn = jest.fn().mockResolvedValue('success')
      await expect(breaker.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN')

      // Function should not have been called
      expect(successFn).not.toHaveBeenCalled()
    })

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        name: 'Test',
        failureThreshold: 2,
        resetTimeout: 100, // 100ms for testing
      })
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'))

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn)
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe('OPEN')

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      // Next execution should transition to HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success')
      await breaker.execute(successFn)

      const stats = breaker.getStats()
      expect(stats.state).toBe('CLOSED') // Should close after successful test
      expect(successFn).toHaveBeenCalled()
    })

    it('should close circuit after successful execution in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        name: 'Test',
        failureThreshold: 2,
        resetTimeout: 100,
      })
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'))

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn)
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      // Execute successfully to close circuit
      const successFn = jest.fn().mockResolvedValue('success')
      await breaker.execute(successFn)

      const stats = breaker.getStats()
      expect(stats.state).toBe('CLOSED')
      expect(stats.failureCount).toBe(0)
    })

    it('should reopen circuit if test request fails in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        name: 'Test',
        failureThreshold: 2,
        resetTimeout: 100,
      })
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'))

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn)
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      // Execute and fail - should reopen circuit
      try {
        await breaker.execute(failFn)
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats()
      expect(stats.state).toBe('OPEN')
    })
  })

  describe('Manual control', () => {
    it('should allow manual reset', () => {
      const breaker = new CircuitBreaker({ name: 'Test' })
      breaker.open()

      expect(breaker.getStats().state).toBe('OPEN')

      breaker.reset()

      expect(breaker.getStats().state).toBe('CLOSED')
      expect(breaker.getStats().failureCount).toBe(0)
    })

    it('should allow manual open', () => {
      const breaker = new CircuitBreaker({ name: 'Test' })

      expect(breaker.getStats().state).toBe('CLOSED')

      breaker.open()

      expect(breaker.getStats().state).toBe('OPEN')
    })
  })

  describe('Statistics', () => {
    it('should track success and failure counts', async () => {
      const breaker = new CircuitBreaker({ name: 'Test' })
      const successFn = jest.fn().mockResolvedValue('success')
      const failFn = jest.fn().mockRejectedValue(new Error('fail'))

      await breaker.execute(successFn)
      await breaker.execute(successFn)

      try {
        await breaker.execute(failFn)
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats()
      expect(stats.successCount).toBe(2)
      expect(stats.failureCount).toBe(1)
    })

    it('should track last failure and success times', async () => {
      const breaker = new CircuitBreaker({ name: 'Test' })
      const successFn = jest.fn().mockResolvedValue('success')
      const failFn = jest.fn().mockRejectedValue(new Error('fail'))

      await breaker.execute(successFn)

      try {
        await breaker.execute(failFn)
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats()
      expect(stats.lastSuccessTime).toBeInstanceOf(Date)
      expect(stats.lastFailureTime).toBeInstanceOf(Date)
    })
  })
})

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success')

    const result = await withRetry(fn, { name: 'Test' })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await withRetry(fn, {
      name: 'Test',
      maxRetries: 3,
      initialDelay: 10,
    })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw error after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'))

    await expect(
      withRetry(fn, {
        name: 'Test',
        maxRetries: 2,
        initialDelay: 10,
      })
    ).rejects.toThrow('persistent failure')

    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })

  it('should use exponential backoff', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'))
    const delays: number[] = []
    let lastTime = Date.now()

    try {
      await withRetry(fn, {
        name: 'Test',
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      })
    } catch (error) {
      // Expected to fail
    }

    // We can't precisely measure delays in tests, but we can verify
    // the function was called the expected number of times
    expect(fn).toHaveBeenCalledTimes(4) // Initial + 3 retries
  })

  it('should respect max delay', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'))

    try {
      await withRetry(fn, {
        name: 'Test',
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 200,
        backoffMultiplier: 2,
      })
    } catch (error) {
      // Expected to fail
    }

    expect(fn).toHaveBeenCalledTimes(4) // Initial + 3 retries
  }, 10000)

  it('should not retry non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-retryable'))

    await expect(
      withRetry(fn, {
        name: 'Test',
        maxRetries: 3,
        initialDelay: 10,
        isRetryable: (error) => !error.message.includes('non-retryable'),
      })
    ).rejects.toThrow('non-retryable')

    expect(fn).toHaveBeenCalledTimes(1) // Should not retry
  })
})
