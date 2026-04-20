/**
 * Circuit Breaker Pattern
 * 
 * Implements circuit breaker pattern to prevent cascading failures
 * when external services (like Gelato API) are experiencing issues.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered, allows one test request
 * 
 * Requirements: 2.3
 */

import { logger } from '../logger'

// ============================================================================
// Types
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening the circuit
   * @default 5
   */
  failureThreshold?: number

  /**
   * Time in milliseconds to wait before attempting to close the circuit
   * @default 60000 (1 minute)
   */
  resetTimeout?: number

  /**
   * Name of the circuit breaker for logging
   * @default 'CircuitBreaker'
   */
  name?: string
}

export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  nextAttemptTime?: Date
}

// ============================================================================
// Circuit Breaker Class
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount: number = 0
  private successCount: number = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextAttemptTime?: Date
  private readonly failureThreshold: number
  private readonly resetTimeout: number
  private readonly name: string

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 60000 // 1 minute
    this.name = options.name || 'CircuitBreaker'
  }

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws Error if circuit is open or function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.state = 'HALF_OPEN'
      logger.info(`[${this.name}] Circuit transitioning to HALF_OPEN state`)
    }

    // Reject immediately if circuit is OPEN
    if (this.state === 'OPEN') {
      const error = new Error(
        `Circuit breaker is OPEN. Service is unavailable. Next attempt at ${this.nextAttemptTime?.toISOString()}`
      )
      logger.warn(`[${this.name}] Request rejected - circuit is OPEN`, {
        nextAttemptTime: this.nextAttemptTime,
      })
      throw error
    }

    try {
      // Execute the function
      const result = await fn()

      // Record success
      this.onSuccess()

      return result
    } catch (error) {
      // Record failure
      this.onFailure()

      throw error
    }
  }

  /**
   * Record a successful execution
   * 
   * @private
   */
  private onSuccess(): void {
    this.successCount++
    this.lastSuccessTime = new Date()

    if (this.state === 'HALF_OPEN') {
      // Success in HALF_OPEN state means we can close the circuit
      this.state = 'CLOSED'
      this.failureCount = 0
      this.nextAttemptTime = undefined
      logger.info(`[${this.name}] Circuit closed after successful test request`, {
        successCount: this.successCount,
      })
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0
    }
  }

  /**
   * Record a failed execution
   * 
   * @private
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.state === 'HALF_OPEN') {
      // Failure in HALF_OPEN state means we go back to OPEN
      this.state = 'OPEN'
      this.nextAttemptTime = new Date(Date.now() + this.resetTimeout)
      logger.warn(`[${this.name}] Circuit opened after failed test request`, {
        failureCount: this.failureCount,
        nextAttemptTime: this.nextAttemptTime,
      })
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Too many failures in CLOSED state, open the circuit
      this.state = 'OPEN'
      this.nextAttemptTime = new Date(Date.now() + this.resetTimeout)
      logger.error(`[${this.name}] Circuit opened after ${this.failureCount} consecutive failures`, {
        failureThreshold: this.failureThreshold,
        nextAttemptTime: this.nextAttemptTime,
      })
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   * 
   * @private
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false
    }

    return Date.now() >= this.nextAttemptTime.getTime()
  }

  /**
   * Get current circuit breaker state
   * 
   * @returns Current state (CLOSED, OPEN, or HALF_OPEN)
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get current circuit breaker statistics
   * 
   * @returns Current stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   * 
   * Use with caution - typically the circuit should reset automatically.
   */
  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.nextAttemptTime = undefined
    logger.info(`[${this.name}] Circuit manually reset to CLOSED state`)
  }

  /**
   * Manually open the circuit breaker
   * 
   * Useful for maintenance or when you know the service is down.
   */
  open(): void {
    this.state = 'OPEN'
    this.nextAttemptTime = new Date(Date.now() + this.resetTimeout)
    logger.warn(`[${this.name}] Circuit manually opened`, {
      nextAttemptTime: this.nextAttemptTime,
    })
  }
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 4
   */
  maxRetries?: number

  /**
   * Initial delay in milliseconds
   * @default 1000 (1 second)
   */
  initialDelay?: number

  /**
   * Maximum delay in milliseconds
   * @default 16000 (16 seconds)
   */
  maxDelay?: number

  /**
   * Backoff multiplier
   * @default 2 (exponential)
   */
  backoffMultiplier?: number

  /**
   * Name for logging
   * @default 'Retry'
   */
  name?: string

  /**
   * Function to determine if error is retryable
   * @default () => true (retry all errors)
   */
  isRetryable?: (error: Error) => boolean
}

/**
 * Execute a function with retry logic and exponential backoff
 * 
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result of the function
 * @throws Error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 4
  const initialDelay = options.initialDelay || 1000
  const maxDelay = options.maxDelay || 16000
  const backoffMultiplier = options.backoffMultiplier || 2
  const name = options.name || 'Retry'
  const isRetryable = options.isRetryable || (() => true)

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[${name}] Attempt ${attempt + 1}/${maxRetries + 1}`)
      const result = await fn()
      
      if (attempt > 0) {
        logger.info(`[${name}] Succeeded after ${attempt} retries`)
      }
      
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (!isRetryable(lastError)) {
        logger.warn(`[${name}] Error is not retryable, giving up`, {
          error: lastError.message,
        })
        throw lastError
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        logger.error(`[${name}] All ${maxRetries + 1} attempts failed`, {
          error: lastError.message,
        })
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      )

      logger.warn(`[${name}] Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: lastError.message,
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error')
}
