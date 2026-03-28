// Load environment variables FIRST, before any imports
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

// Add fetch polyfill for Node.js environment
require('whatwg-fetch')

// Now import testing library
require('@testing-library/jest-dom')

