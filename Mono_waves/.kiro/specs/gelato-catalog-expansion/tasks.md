# Implementation Plan: Gelato Catalog Expansion

## Overview

This implementation expands the Gelato product catalog from 7 to 50+ products, adds 24-hour caching, tracks product availability in the database, and displays status indicators in the admin UI. The approach prioritizes backward compatibility while adding new caching and tracking layers.

## Tasks

- [x] 1. Create database schema for availability tracking
  - Create migration file for gelato_products table with columns: uid (PK), name, type, status, last_seen, created_at, updated_at, metadata
  - Create migration file for gelato_availability_history table with columns: id (PK), product_uid (FK), status, changed_at, notes
  - Add indexes on product_uid, status, and last_seen columns
  - Run migrations and verify tables exist
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 2. Implement cache manager service
  - [x] 2.1 Create CacheManager class with get, set, invalidate, and isValid methods
    - Implement in-memory cache with TTL support (24 hours = 86400 seconds)
    - Use cache key format: `gelato:catalog:v1`
    - Store CachedData interface with data, cachedAt, and expiresAt fields
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ]* 2.2 Write property test for cache TTL behavior
    - **Property 4: Cache Serves Within TTL**
    - **Validates: Requirements 2.2, 2.4, 6.3**
  
  - [ ]* 2.3 Write property test for cache metadata completeness
    - **Property 5: Cache Metadata Completeness**
    - **Validates: Requirements 2.5**
  
  - [x]* 2.4 Write unit tests for cache operations
    - Test cache expiration after 24 hours
    - Test cache invalidation
    - Test cache miss scenarios
    - _Requirements: 2.3, 2.6_

- [x] 3. Update Gelato service to relax product filtering
  - [x] 3.1 Modify excludeKeywords list in gelatoService.ts (lines 175-185)
    - Remove category-based exclusions (hat, bag, mug, poster, sticker, phone case)
    - Keep only truly irrelevant exclusions (gift card, voucher, sample pack, test product, discontinued, legacy)
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Create getExpandedProductCatalog method
    - Fetch products with minimal filtering
    - Ensure at least 50 unique product types returned
    - Preserve existing variant grouping logic
    - Maintain product UID validation
    - _Requirements: 1.1, 1.4, 1.5, 7.1, 7.2_
  
  - [ ]* 3.3 Write property test for minimum product variety
    - **Property 1: Minimum Product Variety**
    - **Validates: Requirements 1.1**
  
  - [ ]* 3.4 Write property test for variant grouping
    - **Property 2: Variant Grouping Preservation**
    - **Validates: Requirements 1.4**
  
  - [ ]* 3.5 Write property test for valid product UIDs
    - **Property 3: Valid Product UIDs**
    - **Validates: Requirements 1.5, 7.1, 7.2**
  
  - [ ]* 3.6 Write unit test for specific product categories
    - Verify hats, bags, mugs, posters, stickers, phone cases are included
    - _Requirements: 1.2_

- [x] 4. Checkpoint - Ensure expanded catalog works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement catalog service with availability tracking
  - [x] 5.1 Create CatalogService class with getCatalog, refreshCatalog, and updateAvailability methods
    - Implement getCatalog with cache check logic
    - Implement refreshCatalog with cache invalidation
    - Implement getProductAvailability for database queries
    - Implement updateAvailability for status tracking
    - _Requirements: 2.1, 2.2, 3.1, 5.1, 5.2_
  
  - [x] 5.2 Implement availability detection logic
    - Detect new products (not in database)
    - Detect discontinued products (in database but not in API response)
    - Update last_seen timestamps for existing products
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 5.3 Implement availability history recording
    - Insert history record on status changes
    - Preserve product core data during updates
    - _Requirements: 3.5, 3.6_
  
  - [ ]* 5.4 Write property test for product availability recording
    - **Property 6: Product Availability Recording**
    - **Validates: Requirements 3.1**
  
  - [ ]* 5.5 Write property test for discontinued product detection
    - **Property 7: Discontinued Product Detection**
    - **Validates: Requirements 3.3**
  
  - [ ]* 5.6 Write property test for new product detection
    - **Property 8: New Product Detection**
    - **Validates: Requirements 3.4**
  
  - [ ]* 5.7 Write property test for availability history tracking
    - **Property 9: Availability History Tracking**
    - **Validates: Requirements 3.5, 8.3**
  
  - [ ]* 5.8 Write property test for product data preservation
    - **Property 10: Product Data Preservation**
    - **Validates: Requirements 3.6**
  
  - [ ]* 5.9 Write unit tests for availability transitions
    - Test product becoming unavailable
    - Test product status changes
    - _Requirements: 3.2_

- [x] 6. Implement error handling and rate limiting
  - [x] 6.1 Add exponential backoff for rate limit errors
    - Implement retry logic with delays: 1s, 2s, 4s, 8s, 16s (max 5 retries)
    - Serve stale cache on all retries failed
    - _Requirements: 6.1, 6.2_
  
  - [x] 6.2 Add API request logging
    - Log all Gelato API requests with timestamp, endpoint, response status
    - _Requirements: 6.4_
  
  - [x] 6.3 Implement fallback to stale cache on API failures
    - Serve stale cache when Gelato API unavailable
    - Log warnings for monitoring
    - _Requirements: 2.6_
  
  - [ ]* 6.4 Write property test for exponential backoff
    - **Property 15: Exponential Backoff on Rate Limits**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ]* 6.5 Write property test for API request logging
    - **Property 16: API Request Logging**
    - **Validates: Requirements 6.4**
  
  - [ ]* 6.6 Write property test for shared cache across requests
    - **Property 17: Shared Cache Across Requests**
    - **Validates: Requirements 6.5**
  
  - [ ]* 6.7 Write unit test for stale cache on API failure
    - Simulate API unavailable scenario
    - Verify stale cache served with warning
    - _Requirements: 2.6_

- [x] 7. Checkpoint - Ensure caching and error handling work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update catalog API route
  - [x] 8.1 Modify app/api/gelato/catalog/route.ts to use CatalogService
    - Replace direct Gelato API calls with catalogService.getCatalog()
    - Add support for ?refresh=true query parameter
    - Return enriched products with availability status
    - Include metadata (totalCount, cachedAt, source) in response
    - _Requirements: 2.1, 2.2, 5.1_
  
  - [x] 8.2 Add error handling to API route
    - Handle API failures gracefully
    - Return stale cache on errors
    - Return appropriate HTTP status codes
    - _Requirements: 2.6_
  
  - [ ]* 8.3 Write property test for test mode filtering
    - **Property 18: Test Mode Filtering**
    - **Validates: Requirements 7.4**
  
  - [ ]* 8.4 Write unit test for first catalog load
    - Clear cache, load catalog, verify API called and cache populated
    - _Requirements: 2.1_

- [x] 9. Create status badge component
  - [x] 9.1 Create StatusBadge component in components/admin/StatusBadge.tsx
    - Accept status prop of type AvailabilityStatus
    - Render badge with appropriate styling for each status
    - New: blue background (bg-blue-100 text-blue-800 border-blue-300)
    - Available: green background (bg-green-100 text-green-800 border-green-300)
    - Out of Stock: yellow background (bg-yellow-100 text-yellow-800 border-yellow-300)
    - Discontinued: red background with opacity (bg-red-100 text-red-800 border-red-300 opacity-60)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x]* 9.2 Write property test for status badge display
    - **Property 11: Status Badge Display**
    - **Validates: Requirements 4.1**
  
  - [x]* 9.3 Write unit tests for status badge styling
    - Test each status renders correct badge text and CSS classes
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 10. Update admin products page with status indicators and refresh
  - [x] 10.1 Update app/admin/products/new/page.tsx to display status badges
    - Import and use StatusBadge component for each product
    - Display product count in header
    - Show cache metadata (last updated time)
    - _Requirements: 4.1, 4.6_
  
  - [x] 10.2 Add manual refresh button to page header
    - Create refresh button with loading state
    - Call API with ?refresh=true on click
    - Display success/error messages
    - Show loading indicator during refresh
    - Prevent multiple simultaneous refreshes
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 10.3 Write property test for discontinued products visible
    - **Property 12: Discontinued Products Visible**
    - **Validates: Requirements 4.6**
  
  - [ ]* 10.4 Write property test for refresh invalidates cache
    - **Property 13: Refresh Invalidates Cache**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 10.5 Write property test for concurrent refresh prevention
    - **Property 14: Concurrent Refresh Prevention**
    - **Validates: Requirements 5.5**
  
  - [ ]* 10.6 Write unit tests for refresh interactions
    - Test refresh button click triggers API call
    - Test success message display
    - Test error message display
    - Test loading indicator during refresh
    - _Requirements: 5.3, 5.4, 5.6_

- [ ] 11. Implement database query filtering by status
  - [x] 11.1 Add status filtering to CatalogService queries
    - Support filtering products by AvailabilityStatus
    - Use database indexes for performance
    - _Requirements: 8.5_
  
  - [ ]* 11.2 Write property test for status-based query filtering
    - **Property 19: Status-Based Query Filtering**
    - **Validates: Requirements 8.5**

- [-] 12. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify catalog displays 50+ products
  - Verify cache improves load times
  - Verify status badges display correctly
  - Verify manual refresh works
  - Verify availability tracking in database
  - Verify everything by runing npm run build

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (19 properties total)
- Unit tests validate specific examples and edge cases
- The implementation preserves existing product validation and ordering workflows
- TypeScript is used throughout for type safety
