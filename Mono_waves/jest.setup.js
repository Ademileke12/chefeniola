// Load environment variables FIRST, before any imports
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

// Add fetch polyfill for Node.js environment
require('whatwg-fetch')

// Add TextEncoder/TextDecoder polyfill for Node.js environment
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Now import testing library
require('@testing-library/jest-dom')

