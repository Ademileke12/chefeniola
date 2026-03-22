/**
 * Logger Utility
 * 
 * Provides masked logging to prevent PII (Personally Identifiable Information) 
 * from leaking into server logs.
 */

/**
 * Mask an email address (e.g., "a***e@example.com")
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***'
    const [local, domain] = email.split('@')
    if (local.length <= 2) return `${local[0]}***@${domain}`
    return `${local[0]}***${local[local.length - 1]}@${domain}`
}

/**
 * Mask a phone number (e.g., "+1 ***-***-1234")
 */
export function maskPhone(phone: string): string {
    if (!phone) return '***-***-****'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 4) return '***-***-****'
    const last4 = cleaned.slice(-4)
    return `***-***-${last4}`
}

/**
 * Mask a full name (e.g., "J*** D***")
 */
export function maskName(name: string): string {
    if (!name) return '***'
    const parts = name.split(' ')
    return parts
        .map((part) => (part.length > 1 ? `${part[0]}***` : '*'))
        .join(' ')
}

/**
 * Mask sensitive fields in an object
 */
export function maskObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    const masked = { ...obj }
    const sensitiveFields = [
        'email', 'customer_email', 'customerEmail',
        'phone', 'phoneNumber',
        'name', 'customer_name', 'customerName',
        'firstName', 'lastName',
        'addressLine1', 'addressLine2', 'postCode'
    ]

    for (const key of Object.keys(masked)) {
        if (sensitiveFields.includes(key)) {
            if (typeof masked[key] === 'string') {
                if (key.toLowerCase().includes('email')) masked[key] = maskEmail(masked[key])
                else if (key.toLowerCase().includes('phone')) masked[key] = maskPhone(masked[key])
                else masked[key] = '***'
            }
        } else if (typeof masked[key] === 'object') {
            masked[key] = maskObject(masked[key])
        }
    }

    return masked
}

/**
 * Log information with masked PII
 */
export const logger = {
    info: (message: string, data?: any) => {
        if (data) {
            console.log(`[INFO] ${message}`, maskObject(data))
        } else {
            console.log(`[INFO] ${message}`)
        }
    },
    error: (message: string, error?: any) => {
        if (error) {
            console.error(`[ERROR] ${message}`, maskObject(error))
        } else {
            console.error(`[ERROR] ${message}`)
        }
    },
    warn: (message: string, data?: any) => {
        if (data) {
            console.warn(`[WARN] ${message}`, maskObject(data))
        } else {
            console.warn(`[WARN] ${message}`)
        }
    }
}
