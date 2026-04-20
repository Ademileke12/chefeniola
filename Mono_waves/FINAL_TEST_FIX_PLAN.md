# Final Comprehensive Test Fix Plan

**Goal**: Fix ALL 16 remaining test failures without breaking the codebase

**Current Status**: 9/25 passing (36%)
**Target**: 25/25 passing (100%)

---

## Root Cause Analysis

### Primary Issue: Design URL Validation
The `validateOrderForGelato()` function makes actual HTTP `fetch()` requests to verify design URLs are accessible. In tests, these URLs don't exist, causing validation to fail.

**Solution**: Mock global `fetch` in test setup to return successful responses

### Secondary Issue: Email Service Mocks
Email service spies are created but the actual webhook handlers may be using different instances or the mocks aren't properly configured.

**Solution**: Use `jest.mock()` at module level instead of spies

### Tertiary Issue: Retry Logic Not Executing
The retry logic tests expect `gelatoService.submitOrder` to be called multiple times, but validation failures prevent the retry loop from executing.

**Solution**: Ensure test data passes all validation checks

---

## Comprehensive Fix Strategy

### Phase 1: Mock Global Fetch (Fixes 12+ tests)
Add global fetch mock in test setup to return successful responses for all URLs.

```typescript
// In each test file's beforeEach
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  headers: new Headers(),
}) as any
```

### Phase 2: Fix Empty Test Suite (Fixes 1 test)
The `idempotency.test.ts` file has test implementations but they're not being recognized.

**Solution**: Check for syntax errors or missing describe blocks

### Phase 3: Fix Email Service Mocks (Fixes 8 tests)
Email services need proper module-level mocking.

**Solution**: Add `jest.mock('@/lib/services/emailService')` at top of test files

### Phase 4: Fix Retry Logic Tests (Fixes 3 tests)
Ensure gelatoService mock allows retry logic to execute properly.

**Solution**: Configure mocks to fail then succeed, use fake timers

---

## Implementation Plan

### Step 1: Add Global Fetch Mock ✅
**Files**: All 3 integration test files
**Impact**: Should fix 12+ tests immediately

### Step 2: Fix idempotency.test.ts ✅
**File**: `__tests__/integration/idempotency.test.ts`
**Impact**: Should fix 1 test (empty suite error)

### Step 3: Add Email Service Module Mocks ✅
**Files**: `payment-fulfillment-flow.test.ts`
**Impact**: Should fix 8 tests

### Step 4: Fix Retry Logic with Fake Timers ✅
**File**: `gelato-failure-handling.test.ts`
**Impact**: Should fix 3 tests

---

## Detailed Fixes

### Fix 1: Global Fetch Mock

Add to each test file's `beforeEach`:

```typescript
beforeEach(() => {
  // Mock global fetch for design URL validation
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({}),
    text: async () => '',
  }) as any
  
  // ... rest of setup
})

afterEach(() => {
  // Restore fetch
  if (global.fetch && 'mockRestore' in global.fetch) {
    (global.fetch as jest.Mock).mockRestore()
  }
})
```

### Fix 2: Empty Test Suite

Check `idempotency.test.ts` for:
- Missing `describe()` blocks
- Syntax errors
- Commented out tests

### Fix 3: Email Service Mocks

Add at top of `payment-fulfillment-flow.test.ts`:

```typescript
// Mock email service at module level
jest.mock('@/lib/services/emailService', () => ({
  emailService: {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendShippingNotification: jest.fn().mockResolvedValue(undefined),
    sendAdminNotification: jest.fn().mockResolvedValue(undefined),
  },
}))
```

### Fix 4: Retry Logic with Fake Timers

Add to retry tests in `gelato-failure-handling.test.ts`:

```typescript
beforeEach(() => {
  jest.useFakeTimers()
  // ... rest of setup
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

it('should retry with exponential backoff', async () => {
  // ... setup
  
  const promise = orderService.submitToGelato(orderId)
  
  // Fast-forward through retries
  await jest.advanceTimersByTimeAsync(1000) // First retry
  await jest.advanceTimersByTimeAsync(2000) // Second retry
  
  await promise
  
  expect(submitOrderSpy).toHaveBeenCalledTimes(3)
})
```

---

## Expected Results After Fixes

| Fix | Tests Fixed | New Passing | Total Passing |
|-----|-------------|-------------|---------------|
| Initial | - | 9 | 9/25 (36%) |
| + Global Fetch | 12 | 21 | 21/25 (84%) |
| + Empty Suite | 1 | 22 | 22/25 (88%) |
| + Email Mocks | 2 | 24 | 24/25 (96%) |
| + Retry Logic | 1 | 25 | 25/25 (100%) |

---

## Safety Checks

### Before Each Fix:
1. Run tests to establish baseline
2. Apply fix
3. Run tests again
4. If tests break, revert and try alternative approach

### Code Safety:
- ✅ No changes to production code
- ✅ Only test infrastructure changes
- ✅ All mocks are properly cleaned up in afterEach
- ✅ No global state pollution between tests

---

## Rollback Plan

If any fix breaks tests:
1. Revert the specific change
2. Document the issue
3. Try alternative approach
4. Keep other working fixes

---

## Success Criteria

- ✅ All 25 tests passing
- ✅ No production code changes
- ✅ Tests run in isolation (no interdependencies)
- ✅ Mocks properly cleaned up
- ✅ No console errors or warnings

---

## Next Actions

1. Apply global fetch mock to all 3 test files
2. Check idempotency.test.ts for issues
3. Add email service module mocks
4. Fix retry logic with fake timers
5. Run full test suite
6. Document final results
