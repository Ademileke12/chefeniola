# Requirements Document

## Introduction

This specification addresses critical production issues affecting the order confirmation flow on Vercel. Users are experiencing "Order not found" errors after successful payment, missing shipping fees in invoices, and database performance issues due to missing indexes. These issues stem from timing problems between Stripe webhook processing and confirmation page queries, as well as incomplete cost calculations in the checkout session.

## Glossary

- **System**: The e-commerce application running on Vercel
- **Stripe_Webhook**: The Stripe webhook handler that creates orders after payment
- **Confirmation_Page**: The page that displays order details after successful payment
- **Checkout_Session**: The Stripe checkout session containing payment and line item details
- **Database_Index**: A database structure that improves query performance
- **Session_ID**: The unique identifier for a Stripe checkout session (stripe_session_id)
- **Shipping_Fee**: The cost of shipping calculated during checkout
- **Order_Polling**: The process of repeatedly querying for an order until it exists

## Requirements

### Requirement 1: Database Performance Optimization

**User Story:** As a system administrator, I want efficient database queries for order lookups, so that the confirmation page loads quickly and reliably.

#### Acceptance Criteria

1. THE System SHALL create a database index on the stripe_session_id column in the orders table
2. WHEN querying orders by session ID, THE System SHALL use the indexed column for optimal performance
3. THE Database_Index SHALL support unique constraint validation to prevent duplicate orders
4. WHEN the index is created, THE System SHALL verify the index exists before deployment

### Requirement 2: Complete Cost Calculation in Checkout

**User Story:** As a customer, I want my invoice to show all costs including shipping, so that I understand what I'm paying for.

#### Acceptance Criteria

1. WHEN creating a Checkout_Session, THE System SHALL include the shipping fee as a separate line item
2. WHEN calculating the total amount, THE System SHALL sum subtotal, shipping fee, and tax
3. THE Checkout_Session SHALL include metadata with the shipping cost for verification
4. WHEN the Stripe_Webhook processes payment, THE System SHALL store all cost components in the order record
5. THE System SHALL validate that shipping_cost is greater than or equal to zero before creating the session

### Requirement 3: Order Creation Verification

**User Story:** As a developer, I want to verify order creation includes all cost components, so that invoices are accurate.

#### Acceptance Criteria

1. WHEN the Stripe_Webhook creates an order, THE System SHALL extract shipping cost from session metadata
2. WHEN storing the order, THE System SHALL persist subtotal, shipping_cost, tax, and total_amount as separate fields
3. THE System SHALL validate that total_amount equals subtotal plus shipping_cost plus tax
4. WHEN order creation fails validation, THE System SHALL log detailed error information with the session ID
5. THE System SHALL include the stripe_session_id in the order record for lookup

### Requirement 4: Confirmation Page Reliability

**User Story:** As a customer, I want the confirmation page to load successfully after payment, so that I can see my order details.

#### Acceptance Criteria

1. WHEN the Confirmation_Page queries for an order, THE System SHALL use the indexed stripe_session_id column
2. WHEN Order_Polling occurs, THE System SHALL implement exponential backoff between retry attempts
3. THE System SHALL poll for the order up to 10 times with increasing delays
4. WHEN an order is not found after all retries, THE System SHALL display a helpful error message with support contact information
5. WHEN an order is found, THE System SHALL display all cost components including shipping fee

### Requirement 5: Error Handling and Debugging

**User Story:** As a developer, I want comprehensive logging for production issues, so that I can diagnose and fix problems quickly.

#### Acceptance Criteria

1. WHEN the Confirmation_Page fails to find an order, THE System SHALL log the session ID and retry count
2. WHEN the Stripe_Webhook processes a payment, THE System SHALL log the session ID and all cost components
3. WHEN database queries fail, THE System SHALL log the error with context including session ID
4. THE System SHALL include correlation IDs in logs to trace requests across webhook and confirmation page
5. WHEN validation fails, THE System SHALL log the specific validation error and the data that failed

### Requirement 6: End-to-End Flow Validation

**User Story:** As a quality assurance engineer, I want to test the complete checkout flow, so that I can verify all components work together correctly.

#### Acceptance Criteria

1. WHEN testing the checkout flow, THE System SHALL create a test checkout session with shipping costs
2. WHEN the test webhook is triggered, THE System SHALL create an order with all cost components
3. WHEN the test confirmation page loads, THE System SHALL successfully retrieve the order by session ID
4. THE System SHALL verify that the displayed costs match the checkout session costs
5. THE System SHALL provide a test script that validates the entire flow without requiring manual intervention

### Requirement 7: Production Deployment Safety

**User Story:** As a system administrator, I want safe deployment procedures, so that production issues are minimized.

#### Acceptance Criteria

1. WHEN deploying database changes, THE System SHALL create the index using a non-blocking migration
2. WHEN deploying code changes, THE System SHALL verify the database index exists before enabling new code paths
3. THE System SHALL include rollback procedures in deployment documentation
4. WHEN deployment fails, THE System SHALL provide clear error messages indicating which step failed
5. THE System SHALL verify Stripe webhook configuration is correct before marking deployment complete

## Special Considerations

### Database Index Creation

The stripe_session_id index is critical for performance. The migration must:
- Use CREATE INDEX CONCURRENTLY to avoid locking the table
- Verify the column exists and contains data before creating the index
- Add a unique constraint to prevent duplicate orders with the same session ID

### Shipping Cost Integration

Shipping costs must be included in the Stripe checkout session as a line item, not just in metadata. This ensures:
- Stripe's invoice shows the shipping fee
- The total amount charged matches what the customer sees
- The webhook receives complete cost information

### Timing and Race Conditions

The confirmation page may load before the webhook completes. The solution must:
- Implement exponential backoff (e.g., 500ms, 1s, 2s, 4s delays)
- Provide clear feedback to users during polling
- Handle the case where the webhook fails entirely
