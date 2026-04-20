/**
 * Error Handling Utilities
 * 
 * Provides safe error handling and sanitization for API responses
 */

export interface SafeError {
  message: string
  code?: string
  statusCode?: number
}

/**
 * Sanitize error for client response
 * Prevents stack trace exposure in production
 */
export function sanitizeError(error: unknown): SafeError {
  // In production, don't expose detailed error messages
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (error instanceof Error) {
    // Check for known error types
    if (error.name === 'ValidationError') {
      return {
        message: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400
      }
    }
    
    if (error.name === 'UnauthorizedError' || error.message.includes('Unauthorized')) {
      return {
        message: 'Unauthorized access',
        code: 'UNAUTHORIZED',
        statusCode: 401
      }
    }
    
    if (error.name === 'ForbiddenError' || error.message.includes('Forbidden')) {
      return {
        message: 'Access forbidden',
        code: 'FORBIDDEN',
        statusCode: 403
      }
    }
    
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return {
        message: 'Resource not found',
        code: 'NOT_FOUND',
        statusCode: 404
      }
    }
    
    // Generic error handling
    if (isProduction) {
      // Don't expose internal error details in production
      return {
        message: 'An error occurred while processing your request',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      }
    } else {
      // In development, show the actual error message
      return {
        message: error.message,
        code: 'ERROR',
        statusCode: 500
      }
    }
  }
  
  // Unknown error type
  return {
    message: isProduction 
      ? 'An unexpected error occurred' 
      : 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}

/**
 * Log error safely without exposing sensitive information
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString()
  
  if (error instanceof Error) {
    console.error(`[${timestamp}] Error:`, {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      context: context ? sanitizeContext(context) : undefined
    })
  } else {
    console.error(`[${timestamp}] Unknown error:`, error)
  }
}

/**
 * Sanitize context object for logging
 * Removes sensitive information
 */
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'creditCard',
    'ssn'
  ]
  
  const sanitized: Record<string, any> = {}
  
  for (const key in context) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof context[key] === 'object' && context[key] !== null) {
      sanitized[key] = sanitizeContext(context[key])
    } else {
      sanitized[key] = context[key]
    }
  }
  
  return sanitized
}

/**
 * Create a safe error response for API routes
 */
export function createErrorResponse(error: unknown, defaultMessage?: string) {
  const safeError = sanitizeError(error)
  
  return {
    error: safeError.message || defaultMessage || 'An error occurred',
    code: safeError.code,
    statusCode: safeError.statusCode || 500
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error, { function: fn.name, args })
      throw sanitizeError(error)
    }
  }) as T
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized access') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}
