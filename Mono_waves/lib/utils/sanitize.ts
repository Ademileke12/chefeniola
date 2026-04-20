/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Sanitize HTML content
 * Removes potentially dangerous HTML tags and attributes
 * 
 * Note: For full HTML sanitization, install dompurify:
 * npm install dompurify isomorphic-dompurify @types/dompurify
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return ''
  
  // Basic HTML sanitization - removes script tags and dangerous attributes
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

/**
 * Sanitize plain text input
 * Removes HTML tags and dangerous characters
 */
export function sanitizeText(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

/**
 * Sanitize email address
 * Validates and sanitizes email format
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''
  
  // Basic email validation and sanitization
  const sanitized = email.toLowerCase().trim()
  
  // Check if it matches basic email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format')
  }
  
  return sanitized
}

/**
 * Sanitize URL
 * Ensures URL is safe and uses allowed protocols
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol')
    }
    
    return parsed.toString()
  } catch (error) {
    throw new Error('Invalid URL format')
  }
}

/**
 * Sanitize filename
 * Removes dangerous characters from filenames
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return ''
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255) // Limit length
}

/**
 * Escape HTML entities
 * Converts special characters to HTML entities
 */
export function escapeHTML(text: string): string {
  if (!text) return ''
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Sanitize JSON input
 * Validates and sanitizes JSON strings
 */
export function sanitizeJSON(input: string): any {
  if (!input) return null
  
  try {
    const parsed = JSON.parse(input)
    
    // Recursively sanitize string values
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return sanitizeText(value)
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue)
      } else if (typeof value === 'object' && value !== null) {
        const sanitized: any = {}
        for (const key in value) {
          sanitized[key] = sanitizeValue(value[key])
        }
        return sanitized
      }
      return value
    }
    
    return sanitizeValue(parsed)
  } catch (error) {
    throw new Error('Invalid JSON format')
  }
}

/**
 * Redact sensitive information for logging
 * Replaces sensitive data with [REDACTED]
 */
export function redactSensitiveData(data: any): any {
  if (!data) return data
  
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'creditcard',
    'credit_card',
    'ssn',
    'social_security',
  ]
  
  const redact = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(redact)
    }
    
    const redacted: any = {}
    for (const key in obj) {
      const lowerKey = key.toLowerCase()
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = redact(obj[key])
      }
    }
    return redacted
  }
  
  return redact(data)
}

/**
 * Redact PII (Personally Identifiable Information) for logging
 * Replaces PII with [REDACTED]
 */
export function redactPII(data: any): any {
  if (!data) return data
  
  const piiKeys = [
    'email',
    'phone',
    'address',
    'name',
    'firstName',
    'first_name',
    'lastName',
    'last_name',
    'customerName',
    'customer_name',
    'customerEmail',
    'customer_email',
  ]
  
  const redact = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(redact)
    }
    
    const redacted: any = {}
    for (const key in obj) {
      const lowerKey = key.toLowerCase()
      if (piiKeys.some(pii => lowerKey.includes(pii))) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = redact(obj[key])
      }
    }
    return redacted
  }
  
  return redact(data)
}
