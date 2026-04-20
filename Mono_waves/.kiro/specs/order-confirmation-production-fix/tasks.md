# Implementation Plan: Order Confirmation Production Fix

## Overview

This plan implements fixes for the order confirmation flow production issues. The implementation follows a specific order to ensure database changes are in place before code changes that depend on them.

## Tasks

- [x] 1. Create and run database migration for stripe_session_id index
  - Create migration file `supabase/migrations/013_add_stripe_session_id_index.sql`
  - Use CREATE INDEX CONCURRENTLY to avoid table locking
  - Add unique constraint to prevent duplicate orders
  - Include verification step to ensure index creation succeeded
  - Create migration runner script `scripts/run-migration-013.ts`
  - Test migration on local database
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Update Stripe service to include shipping as line item
  - [x] 2.1 Modify createCheckoutSession to add shipping line item
    - Add shipping cost parameter to function signature
    - Create shipping line item with proper Stripe format
    - Add shipping line item to line_items array
    - Include shipping cost in metadata for webhook processing
    - _Requirements: 2.1, 2.3_
  
  - [x] 2.2 Add shipping cost validation
    - Validate shippingCost >= 0 before creating session
    - Throw descriptive error for invalid shipping cost
    - _Requirements: 2.5_
  
  - [x] 2.3 Write unit tests for shipping line item creation
    - Test shipping line item is included in session
    - Test shipping cost in metadata
    - Test negative shipping cost rejection
    - Test shipping cost validation edge cases
    - _Requirements: 2.1, 2.3, 2.5_


- [x] 3. Update checkout API to calculate and pass shipping cost
  - Modify POST /api/checkout to calculate shipping cost
  - Pass shipping cost to stripeService.createCheckoutSession
  - Update CheckoutSessionData type to include shippingCost
  - _Requirements: 2.1, 2.2_

- [x] 4. Update webhook handler to extract and store all cost components
  - [x] 4.1 Extract shipping cost from session metadata
    - Parse shippingCost from session.metadata
    - Handle missing metadata with fallback value
    - Log extraction with session ID
    - _Requirements: 3.1_
  
  - [x] 4.2 Extract tax from Stripe automatic tax calculation
    - Get tax from session.total_details.amount_tax
    - Convert from cents to dollars
    - Handle missing tax with default value of 0
    - _Requirements: 2.4_
  
  - [x] 4.3 Calculate and validate total
    - Calculate subtotal from cart items
    - Calculate total = subtotal + shipping + tax
    - Compare with Stripe's amount_total
    - Log warning if mismatch exceeds 1 cent
    - _Requirements: 2.2, 3.3_
  
  - [x] 4.4 Update order creation call with all cost components
    - Pass subtotal, shippingCost, tax, and total to createOrder
    - Pass stripeSessionId for indexed lookup
    - Pass correlationId for request tracing
    - _Requirements: 2.4, 3.2, 3.5_
  
  - [x] 4.5 Add comprehensive logging
    - Log session ID and correlation ID at start
    - Log all cost components after extraction
    - Log validation errors with full context
    - _Requirements: 5.2, 5.5_
  
  - [x] 4.6 Write unit tests for webhook cost extraction
    - Test shipping cost extraction from metadata
    - Test tax extraction from total_details
    - Test total validation logic
    - Test logging of cost components
    - _Requirements: 3.1, 3.3, 5.2_

- [x] 5. Checkpoint - Verify webhook processing
  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. Update order service with cost validation
  - [x] 6.1 Add cost component validation to createOrder
    - Validate subtotal >= 0
    - Validate shippingCost >= 0
    - Validate tax >= 0
    - Validate total > 0
    - Throw descriptive errors for invalid values
    - _Requirements: 3.2_
  
  - [x] 6.2 Add total validation logic
    - Calculate expected total = subtotal + shipping + tax
    - Compare with provided total (1 cent tolerance)
    - Log validation error with all values and session ID
    - Throw error if validation fails
    - _Requirements: 3.3_
  
  - [x] 6.3 Update database insert to include all cost fields
    - Ensure subtotal, shipping_cost, tax, total are all included
    - Ensure stripe_session_id is included for indexed lookup
    - Ensure correlation_id is included for tracing
    - _Requirements: 3.2, 3.5_
  
  - [x] 6.4 Add error logging with session ID context
    - Log all database errors with session ID
    - Log validation errors with session ID and correlation ID
    - Include full error context in logs
    - _Requirements: 3.4, 5.3_
  
  - [ ]* 6.5 Write unit tests for order validation
    - Test cost component validation
    - Test total validation with exact match
    - Test total validation with tolerance
    - Test validation error logging
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ]* 6.6 Write property test for total calculation
    - **Property 3: Total Equals Sum of Components**
    - **Validates: Requirements 2.2, 3.3**
    - Generate random subtotal, shipping, tax values
    - Verify total = subtotal + shipping + tax (within tolerance)
    - Run 100 iterations


- [x] 7. Create API route for session-based order lookup
  - Create new file `app/api/orders/session/[sessionId]/route.ts`
  - Implement GET handler that calls orderService.getOrderBySessionId
  - Return 404 if order not found
  - Return 500 with logging if database error occurs
  - Log all lookups with session ID
  - _Requirements: 4.1, 5.3_

- [x] 8. Update confirmation page with exponential backoff polling
  - [x] 8.1 Implement exponential backoff polling logic
    - Define delays array: [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000]
    - Implement recursive polling function with delay
    - Track attempt count (max 10 attempts)
    - Stop polling when order found or max attempts reached
    - _Requirements: 4.2, 4.3_
  
  - [x] 8.2 Add comprehensive logging for polling
    - Log each attempt with attempt number and delay
    - Log session ID with each attempt
    - Log final retry count if order not found
    - _Requirements: 5.1_
  
  - [x] 8.3 Update error message display
    - Show helpful message when order not found after retries
    - Include support contact information (support@monowaves.com)
    - Explain that payment was successful but order is processing
    - _Requirements: 4.4_
  
  - [x] 8.4 Update order display to show all cost components
    - Display subtotal as separate line item
    - Display shipping cost as separate line item
    - Display tax as separate line item
    - Display total with all components summed
    - _Requirements: 4.5_
  
  - [x] 8.5 Write unit tests for polling logic
    - Test exponential backoff timing
    - Test max retry limit (10 attempts)
    - Test error message display
    - Test cost component rendering
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 8.6 Write property test for exponential backoff
    - **Property 10: Exponential Backoff Delays**
    - **Validates: Requirements 4.2**
    - Test delay calculation for attempts 1-10
    - Verify delays match expected pattern
    - Run 100 iterations

- [-] 9. Checkpoint - Verify confirmation page polling
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 10. Add property-based tests for core properties
  - [ ]* 10.1 Write property test for unique session ID constraint
    - **Property 1: Unique Session ID Constraint**
    - **Validates: Requirements 1.3**
    - Generate random session IDs
    - Create first order, verify success
    - Attempt duplicate, verify rejection
    - Run 100 iterations
  
  - [ ]* 10.2 Write property test for shipping line item
    - **Property 2: Shipping Fee in Line Items**
    - **Validates: Requirements 2.1**
    - Generate random shipping costs
    - Create checkout session
    - Verify line items include shipping
    - Run 100 iterations
  
  - [ ]* 10.3 Write property test for cost component storage
    - **Property 5: All Cost Components Stored**
    - **Validates: Requirements 2.4, 3.2**
    - Generate random order data
    - Create order from webhook
    - Verify all cost fields are non-null
    - Run 100 iterations
  
  - [ ]* 10.4 Write property test for correlation ID tracing
    - **Property 15: Correlation ID Tracing**
    - **Validates: Requirements 5.4**
    - Generate random correlation IDs
    - Process webhook with correlation ID
    - Verify order has same correlation ID
    - Run 100 iterations

- [ ] 11. Create integration test for end-to-end flow
  - [ ]* 11.1 Write integration test for complete checkout flow
    - Create checkout session with shipping cost
    - Verify session includes shipping line item
    - Trigger webhook with session data
    - Verify order created with all cost components
    - Query order by session ID
    - Verify order found and costs match
    - Verify correlation ID matches across webhook and order
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Create deployment verification script
  - Create script `scripts/verify-order-confirmation-fix.ts`
  - Verify database index exists
  - Test order creation with all cost components
  - Test session ID lookup performance
  - Test duplicate session ID rejection
  - Generate deployment report
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 13. Update deployment documentation
  - Document migration steps in order
  - Document rollback procedures
  - Document verification steps
  - Document Stripe webhook configuration check
  - _Requirements: 7.3, 7.4, 7.5_

- [ ] 14. Final checkpoint - Run all tests and verify deployment readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Database migration (Task 1) must be completed before other tasks
- Checkpoint tasks ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration test validates the complete flow end-to-end

