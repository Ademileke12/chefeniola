/**
 * Country Code Converter
 * 
 * Converts country names to ISO 3166-1 alpha-2 codes for Gelato API
 * 
 * Requirements: 8.2
 */

/**
 * Mapping of country names to ISO 3166-1 alpha-2 codes
 */
const COUNTRY_CODES: Record<string, string> = {
  // North America
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',

  // Europe
  'United Kingdom': 'GB',
  'Great Britain': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Ireland': 'IE',
  'France': 'FR',
  'Germany': 'DE',
  'Italy': 'IT',
  'Spain': 'ES',
  'Portugal': 'PT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',

  // Asia
  'China': 'CN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Korea': 'KR',
  'India': 'IN',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',

  // Oceania
  'Australia': 'AU',
  'New Zealand': 'NZ',

  // South America
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Venezuela': 'VE',

  // Middle East
  'Israel': 'IL',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
  'Saudi Arabia': 'SA',
  'Turkey': 'TR',

  // Africa
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
}

/**
 * Convert country name to ISO 3166-1 alpha-2 code
 * 
 * @param countryName - Full country name or existing ISO code
 * @returns ISO 3166-1 alpha-2 country code
 * 
 * @example
 * convertToISO('United States') // returns 'US'
 * convertToISO('US') // returns 'US' (already ISO code)
 * convertToISO('Unknown Country') // returns 'Unknown Country' (unchanged)
 */
export function convertToISO(countryName: string): string {
  if (!countryName) {
    return countryName
  }

  // Trim whitespace
  const trimmed = countryName.trim()

  // If already a 2-letter code, return as-is
  if (trimmed.length === 2 && trimmed === trimmed.toUpperCase()) {
    return trimmed
  }

  // Look up in mapping (case-insensitive)
  const normalized = trimmed.toLowerCase()
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    if (name.toLowerCase() === normalized) {
      return code
    }
  }

  // If not found, return original value
  // This allows for already-correct ISO codes or edge cases
  return trimmed
}

/**
 * Check if a string is a valid ISO 3166-1 alpha-2 country code
 * 
 * @param code - String to check
 * @returns True if valid ISO code format
 */
export function isValidISOCode(code: string): boolean {
  if (!code || code.length !== 2) {
    return false
  }

  // Check if it's uppercase letters
  return /^[A-Z]{2}$/.test(code)
}

/**
 * Validate and convert country code
 * 
 * @param country - Country name or code
 * @returns Object with converted code and validation status
 */
export function validateAndConvert(country: string): {
  code: string
  isValid: boolean
  wasConverted: boolean
} {
  const original = country
  const converted = convertToISO(country)
  const isValid = isValidISOCode(converted)
  const wasConverted = original !== converted

  return {
    code: converted,
    isValid,
    wasConverted,
  }
}
