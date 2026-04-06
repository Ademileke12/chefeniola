# Implementation Plan: Order Fulfillment Automation

## Overview

This implementation plan breaks down the order fulfillment automation feature into discrete coding tasks. The approach follows a phased implementation:
1. Database and foundational services (email, shipping)
2. Stripe Tax integration
3. Customer-facing pages (confirmation, tracking)
4. Enhanced webhook handlers
5. Testing and validation

Each task builds on previous work, with checkpoints to ensure incremental validation.

## Tasks

- [ ] 1. Database migration and email service setup
  - [x] 1.1 Create database migration to add tax column to orders table
    - Add `tax DECIMAL(10, 2) NOT NULL DEFAULT 0` column
    - Add check constraint `CHECK (tax >= 0)`
    - Update existing orders to have 0 tax
    - _Requirements: 4.5_
  
  - [x] 1.2 Install Resend package and create email service
    - Install `resend` npm package
    - Create `lib/services/emailService.ts` with Resend client initialization
    - Implement `sendOrderConfirmation()` method
    - Implement `sendShippingNotification()` method
    - Implement `sendAdminNotification()` method
    - _Requirements: 3.1, 3.3, 2.3_
  
  - [x] 1.3 Create email templates
    - Create order confirmation email template with order details
    - Create shipping notification email template with tracking info
    - Create admin notification email template for errors
    - Include proper styling and branding
    - _Requirements: 3.2, 3.4_
  
  - [x] 1.4 Write unit tests for email service
    - Test email service initialization
    - Test email template rendering with sample data
    - Test error handling for API failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Shipping cost service
  - [x] 2.1 Create shipping service with Gelato API integration
    - Create `lib/services/shippingService.ts`
    - Implement `getShippingCost()` method to query Gelato API
    - Add request/response type definitions
    - Implement 5-minute caching layer
    - Implement $10 fallback for API failures
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [x] 2.2 Write property test for shipping cost fallback
    - **Property 16: Shipping Cost Fallback on API Failure**
    - **Validates: Requirements 5.5**
  
  - [x] 2.3 Write unit tests for shipping service
    - Test successful API response parsing
    - Test caching behavior
    - Test fallback on API errors
    - Test various address formats
    - _Requirements: 5.1, 5.2, 5.5_

- [ ] 3. Stripe Tax integration
  - [x] 3.1 Update Stripe service to enable automatic tax
    - Modify `createCheckoutSession()` to include `automatic_tax: { enabled: true }`
    - Update TypeScript types for tax fields
    - _Requirements: 4.1, 4.2_
  
  - [x] 3.2 Update order service to handle tax
    - Add `tax` field to `CreateOrderData` interface
    - Update `createOrder()` to accept and store tax amount
    - Add `getOrderBySessionId()` method for confirmation page
    - Make `stripeSessionId` required in order creation
    - _Requirements: 4.5_
  
  - [x] 3.3 Write property test for order total arithmetic
    - **Property 13: Order Total Arithmetic Correctness**
    - **Validates: Requirements 4.1, 4.4**
  
  - [x] 3.4 Write unit tests for tax handling
    - Test order creation with tax amount
    - Test order retrieval by session ID
    - Test tax storage and retrieval
    - _Requirements: 4.1, 4.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Order confirmation page
  - [x] 5.1 Create order confirmation page component
    - Create `app/order/confirmation/page.tsx`
    - Implement server-side data fetching using session ID
    - Display order number, items, shipping address, totals
    - Calculate and display estimated delivery date (7-10 business days)
    - Show tracking number if available
    - Add "Track Order" button linking to tracking page
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 5.2 Add helper function for estimated delivery calculation
    - Create `calculateEstimatedDelivery()` in order service
    - Calculate 7-10 business days from order date
    - Return formatted date string
    - _Requirements: 1.3_
  
  - [x] 5.3 Write property test for confirmation page data display
    - **Property 2: Confirmation Page Contains Required Order Information**
    - **Validates: Requirements 1.2**
  
  - [x] 5.4 Write property test for estimated delivery date
    - **Property 3: Estimated Delivery Date is Future Date**
    - **Validates: Requirements 1.3**
  
  - [x] 5.5 Write unit tests for confirmation page
    - Test page renders with valid session ID
    - Test page handles missing session ID
    - Test page handles invalid session ID
    - Test conditional tracking display
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Order tracking page
  - [x] 6.1 Create order tracking page component
    - Create `app/order/track/page.tsx`
    - Implement form for email and order number input
    - Implement order lookup using `trackOrder()` service method
    - Display order status with user-friendly messages
    - Show tracking number and carrier when available
    - Generate and display carrier tracking URL
    - Handle "not found" gracefully
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 6.2 Add carrier tracking URL generator
    - Create `getCarrierTrackingUrl()` helper function
    - Support major carriers (USPS, UPS, FedEx, DHL)
    - Return carrier-specific tracking URL
    - _Requirements: 6.4_
  
  - [x] 6.3 Write property test for tracking page display
    - **Property 17: Tracking Page Displays Order Status**
    - **Validates: Requirements 6.2, 6.3**
  
  - [x] 6.4 Write property test for carrier URL generation
    - **Property 18: Carrier Tracking URL Generation**
    - **Validates: Requirements 6.4**
  
  - [x] 6.5 Write unit tests for tracking page
    - Test form validation
    - Test successful order lookup
    - Test failed order lookup
    - Test tracking info display
    - Test carrier URL generation for known carriers
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Enhanced Stripe webhook handler
  - [x] 8.1 Update Stripe webhook to extract tax and send confirmation email
    - Extract tax amount from `session.total_details.amount_tax`
    - Pass tax and session ID to `createOrder()`
    - Send confirmation email after order creation
    - Send admin notification on errors
    - _Requirements: 2.3, 3.1, 4.1, 4.5_
  
  - [x] 8.2 Write property test for payment success flow
    - **Property 5: Payment Success Triggers Gelato Submission**
    - **Validates: Requirements 2.1, 2.4**
  
  - [x] 8.3 Write property test for confirmation email sending
    - **Property 9: Payment Success Triggers Confirmation Email**
    - **Validates: Requirements 3.1**
  
  - [x] 8.4 Write property test for confirmation email content
    - **Property 10: Confirmation Email Contains Required Information**
    - **Validates: Requirements 3.2**
  
  - [x] 8.5 Write property test for error handling
    - **Property 7: Gelato Submission Failure Triggers Error Handling**
    - **Validates: Requirements 2.3**
  
  - [x] 8.6 Write unit tests for enhanced webhook handler
    - Test tax extraction from Stripe session
    - Test confirmation email sending
    - Test admin notification on Gelato failure
    - Test error handling and logging
    - _Requirements: 2.3, 3.1, 4.1_

- [ ] 9. Enhanced Gelato webhook handler
  - [x] 9.1 Update Gelato webhook to send shipping notification email
    - Send shipping notification when order status is "shipped"
    - Include tracking number, carrier, and tracking URL in email
    - Handle missing tracking information gracefully
    - _Requirements: 3.3, 3.4, 6.5_
  
  - [x] 9.2 Write property test for shipping notification
    - **Property 11: Order Shipment Triggers Notification Email**
    - **Validates: Requirements 3.3**
  
  - [x] 9.3 Write property test for shipping email content
    - **Property 12: Shipping Email Contains Tracking Information**
    - **Validates: Requirements 3.4, 6.5**
  
  - [x] 9.4 Write unit tests for enhanced Gelato webhook
    - Test shipping notification email sending
    - Test tracking info extraction
    - Test carrier URL generation
    - Test error handling
    - _Requirements: 3.3, 3.4, 6.5_

- [ ] 10. Update checkout flow with dynamic shipping
  - [x] 10.1 Integrate shipping service into checkout API
    - Query Gelato API for shipping cost before creating Stripe session
    - Pass shipping cost to Stripe checkout session
    - Handle API failures with fallback
    - Display shipping cost in cart summary
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 10.2 Write property test for shipping cost in checkout
    - **Property 15: Shipping Cost Included in Checkout**
    - **Validates: Requirements 5.1, 5.2, 5.4**
  
  - [x] 10.3 Write unit tests for checkout with dynamic shipping
    - Test successful shipping cost retrieval
    - Test fallback on API failure
    - Test shipping cost included in Stripe session
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 11. Data persistence and status transition tests
  - [x] 11.1 Write property test for order data persistence
    - **Property 6: Order Data Persistence Round Trip**
    - **Validates: Requirements 2.2, 4.5, 6.1**
  
  - [x] 11.2 Write property test for order status transitions
    - **Property 8: Order Status Transitions After Gelato Submission**
    - **Validates: Requirements 2.5**
  
  - [x] 11.3 Write property test for tracking info persistence
    - **Property 6: Order Data Persistence Round Trip** (covers tracking)
    - **Validates: Requirements 6.1**

- [ ] 12. Final integration and validation
  - [x] 12.1 Add environment variable validation
    - Validate all required env vars on startup
    - Provide clear error messages for missing vars
    - Document all new environment variables
    - _Requirements: All_
  
  - [x] 12.2 Update API documentation
    - Document new confirmation page route
    - Document new tracking page route
    - Document webhook enhancements
    - _Requirements: All_
  
  - [x] 12.3 Write integration tests for end-to-end flow
    - Test complete flow from payment to email
    - Test webhook handling with real payload formats
    - Test database transactions
    - _Requirements: All_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a phased approach to minimize risk
- Database migration must be run before deploying code changes
- Stripe Tax must be enabled in Stripe Dashboard before testing
- Resend API key must be configured before testing email functionality
