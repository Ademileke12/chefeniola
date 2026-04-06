/**
 * Validation utility functions
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isFinite(price)
}

export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Remove script-related content
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  // Trim whitespace
  return sanitized.trim()
}

/**
 * Validate string input for XSS patterns
 * Returns true if input contains suspicious patterns
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') return false
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate SQL injection patterns
 * Returns true if input contains suspicious SQL patterns
 */
export function containsSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /('|")\s*(OR|AND)\s*('|")/i,
    /(UNION.*SELECT)/i,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate file upload
 * Returns error message if invalid, null if valid
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number = 10): string | null {
  // Check file type
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  // Check against allowed MIME types
  const isAllowedType = allowedTypes.some(type => fileType.includes(type))
  
  // Also check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf']
  const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
  
  if (!isAllowedType || !hasAllowedExtension) {
    return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `File too large. Maximum size: ${maxSizeMB}MB`
  }
  
  // Check for dangerous extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx', '.jsp', '.js', '.vbs']
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    return 'Dangerous file type not allowed'
  }
  
  return null
}

/**
 * Validate and sanitize object for XSS and SQL injection
 */
export function validateAndSanitizeObject(obj: any): { isValid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = []
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Check for XSS
      if (containsXSS(value)) {
        errors.push(`Field '${key}' contains potentially malicious content`)
      }
      
      // Check for SQL injection
      if (containsSQLInjection(value)) {
        errors.push(`Field '${key}' contains potentially malicious SQL patterns`)
      }
      
      // Sanitize the value
      sanitized[key] = sanitizeString(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}
