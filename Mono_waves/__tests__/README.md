# Mono Waves E-Commerce Tests

This directory contains the test suite for the Mono Waves e-commerce platform, including unit tests, integration tests, and property-based tests.

## Test Structure

```
__tests__/
├── properties/          # Property-based tests (PBT)
│   └── product-crud.test.ts
├── utils/              # Test utilities and helpers
│   ├── arbitraries.ts  # fast-check arbitraries for generating test data
│   └── testDb.ts       # Database test helpers
├── setup.test.ts       # Basic setup verification
└── fast-check.test.ts  # fast-check library verification
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- __tests__/properties/product-crud.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Property-Based Testing

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) to validate universal correctness properties across many randomly generated inputs.

### Current Properties

#### Property 1: Product CRUD Consistency
- **Location**: `__tests__/properties/product-crud.test.ts`
- **Validates**: Requirements 1.4
- **Description**: For any valid product data, creating a product then retrieving it should return equivalent product data with published status set to false.
- **Iterations**: 100 per test run

### Running Property Tests with Database

Property tests that interact with the database require Supabase configuration:

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Configure Supabase environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

3. Run the database migration:
```bash
# See supabase/migrations/README.md for instructions
```

4. Run the tests:
```bash
npm test -- __tests__/properties/
```

### Test Behavior Without Database

When Supabase is not configured:
- Property tests will gracefully skip with a warning message
- Test suite will still pass
- No database operations will be attempted

This allows development and CI/CD to proceed without requiring database access for every test run.

## Test Utilities

### Arbitraries (`__tests__/utils/arbitraries.ts`)

Provides fast-check arbitraries for generating valid test data:

- `createProductDataArbitrary()` - Generates valid product creation data
- `productColorArbitrary()` - Generates valid product colors
- `priceArbitrary()` - Generates valid prices
- `quantityArbitrary()` - Generates valid quantities
- `emailArbitrary()` - Generates valid email addresses

Example usage:
```typescript
import * as fc from 'fast-check'
import { createProductDataArbitrary } from '../utils/arbitraries'

fc.assert(
  fc.asyncProperty(
    createProductDataArbitrary(),
    async (productData) => {
      // Test with generated product data
    }
  ),
  { numRuns: 100 }
)
```

### Database Helpers (`__tests__/utils/testDb.ts`)

Provides utilities for database testing:

- `cleanupTestData()` - Removes test data after tests
- `isSupabaseConfigured()` - Checks if Supabase is available
- `skipIfNoSupabase()` - Helper to skip tests when DB unavailable

## Writing New Tests

### Unit Tests

Create unit tests for specific functionality:

```typescript
import { describe, it, expect } from '@jest/globals'

describe('MyComponent', () => {
  it('should do something specific', () => {
    // Test specific behavior
    expect(result).toBe(expected)
  })
})
```

### Property-Based Tests

Create property tests for universal correctness:

```typescript
import * as fc from 'fast-check'
import { describe, it, expect, afterEach } from '@jest/globals'
import { cleanupTestData } from '../utils/testDb'

describe('My Properties', () => {
  afterEach(async () => {
    await cleanupTestData()
  })

  it('Property N: Description', async () => {
    await fc.assert(
      fc.asyncProperty(
        myArbitrary(),
        async (data) => {
          // Test universal property
          expect(result).toSatisfyProperty()
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

## Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All correctness properties from design document
- **Integration Test Coverage**: All external API integrations

## Continuous Integration

Tests run automatically on:
- Every commit (via pre-commit hook)
- Every pull request
- Before deployment

## Troubleshooting

### Tests Timing Out

Property-based tests may take longer due to 100 iterations. Increase timeout:

```typescript
it('Property test', async () => {
  // Test code
}, 60000) // 60 second timeout
```

### Database Connection Issues

If tests fail with database errors:
1. Verify Supabase environment variables are correct
2. Check that database migrations have been run
3. Ensure network connectivity to Supabase
4. Check Supabase project status in dashboard

### Fast-check Shrinking

When a property test fails, fast-check will "shrink" to find the minimal failing case:

```
Property failed after 42 tests
{ seed: 123456789, path: "42:0:1", endOnFailure: true }
Counterexample: { name: "A", price: 0.01, ... }
```

Use the seed to reproduce the exact failure:
```typescript
fc.assert(property, { seed: 123456789 })
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [React Testing Library](https://testing-library.com/react)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
