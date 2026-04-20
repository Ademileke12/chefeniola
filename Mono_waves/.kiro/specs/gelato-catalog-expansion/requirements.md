# Requirements Document

## Introduction

The Gelato product catalog system currently displays only 7 products due to aggressive filtering and lacks caching mechanisms, resulting in slow load times and limited product variety. This feature will expand the catalog to show 50+ products, implement intelligent caching, track product availability, and provide clear UI status indicators for product states.

## Glossary

- **Gelato_API**: The external Gelato print-on-demand service API that provides product catalog data
- **Catalog_Cache**: A time-based storage mechanism that retains Gelato product data for 24 hours
- **Product_Availability**: The current stock status of a product (available, out of stock, discontinued)
- **Product_UID**: Unique identifier for Gelato products used for validation and ordering
- **Catalog_Service**: The system component responsible for fetching, caching, and managing product catalog data
- **Admin_Interface**: The web interface at `/admin/products/new` where administrators select products
- **Availability_Status**: An enumeration of product states: new, available, out_of_stock, discontinued
- **Refresh_Mechanism**: A manual trigger that forces immediate catalog update from Gelato_API

## Requirements

### Requirement 1: Expand Product Catalog Variety

**User Story:** As an administrator, I want to see a wide variety of product types in the catalog, so that I can offer diverse products to customers.

#### Acceptance Criteria

1. WHEN the catalog is loaded THEN the System SHALL display at least 50 unique product types
2. WHEN filtering products THEN the System SHALL include hats, bags, mugs, posters, stickers, and phone cases
3. WHEN the exclude keywords list is applied THEN the System SHALL only filter out truly irrelevant products (not entire product categories)
4. WHEN grouping product variants THEN the System SHALL maintain the existing variant grouping logic (size/color combinations)
5. THE System SHALL preserve the existing product UID validation before displaying products

### Requirement 2: Implement Catalog Caching

**User Story:** As an administrator, I want the catalog to load quickly, so that I can efficiently browse and select products.

#### Acceptance Criteria

1. WHEN the catalog is first loaded THEN the System SHALL fetch data from Gelato_API and store it in Catalog_Cache
2. WHEN the catalog is loaded within 24 hours of the last fetch THEN the System SHALL serve data from Catalog_Cache
3. WHEN the cache expires (after 24 hours) THEN the System SHALL automatically fetch fresh data from Gelato_API
4. WHEN serving from cache THEN the System SHALL respond within 1 second
5. THE System SHALL store cache metadata including timestamp and expiration time
6. WHEN Gelato_API is unavailable THEN the System SHALL serve stale cache data and log a warning

### Requirement 3: Track Product Availability

**User Story:** As an administrator, I want to know which products are currently available, so that I can make informed decisions about product offerings.

#### Acceptance Criteria

1. WHEN a product is fetched from Gelato_API THEN the System SHALL record its availability status in the database
2. WHEN a product becomes unavailable THEN the System SHALL update its status to out_of_stock
3. WHEN a previously available product is no longer returned by Gelato_API THEN the System SHALL mark it as discontinued
4. WHEN a new product appears in Gelato_API THEN the System SHALL mark it with status new
5. THE System SHALL maintain a history of availability changes with timestamps
6. WHEN updating availability THEN the System SHALL preserve existing product data (name, UID, variants)

### Requirement 4: Display Product Status Indicators

**User Story:** As an administrator, I want to see visual indicators for product status, so that I can quickly identify available, new, and unavailable products.

#### Acceptance Criteria

1. WHEN displaying a product THEN the Admin_Interface SHALL show a status badge indicating its Availability_Status
2. WHEN a product is new THEN the Admin_Interface SHALL display a "New" badge with distinct styling
3. WHEN a product is available THEN the Admin_Interface SHALL display an "Available" badge with green styling
4. WHEN a product is out of stock THEN the Admin_Interface SHALL display an "Out of Stock" badge with yellow styling
5. WHEN a product is discontinued THEN the Admin_Interface SHALL display a "Discontinued" badge with red styling and reduced opacity
6. THE Admin_Interface SHALL still display discontinued products but visually distinguish them from available products

### Requirement 5: Manual Catalog Refresh

**User Story:** As an administrator, I want to manually refresh the catalog, so that I can get the latest product data when needed.

#### Acceptance Criteria

1. WHEN the admin clicks the refresh button THEN the System SHALL immediately fetch fresh data from Gelato_API
2. WHEN refresh is triggered THEN the System SHALL invalidate the current Catalog_Cache
3. WHEN refresh completes THEN the System SHALL update the cache with new data and display a success message
4. WHEN refresh fails THEN the System SHALL display an error message and retain the existing cache
5. THE System SHALL prevent multiple simultaneous refresh operations
6. WHEN refresh is in progress THEN the Admin_Interface SHALL display a loading indicator

### Requirement 6: Maintain API Rate Limits

**User Story:** As a system administrator, I want the system to respect Gelato API rate limits, so that our API access remains uninterrupted.

#### Acceptance Criteria

1. WHEN making API requests THEN the System SHALL implement exponential backoff for rate limit errors
2. WHEN Gelato_API returns a rate limit error THEN the System SHALL wait before retrying
3. WHEN cache is valid THEN the System SHALL NOT make unnecessary API requests
4. THE System SHALL log all API requests with timestamps for monitoring
5. WHEN multiple admins access the catalog simultaneously THEN the System SHALL serve from a shared cache

### Requirement 7: Preserve Existing Product Validation

**User Story:** As a system administrator, I want to ensure only valid products are displayed, so that orders can be successfully fulfilled.

#### Acceptance Criteria

1. WHEN displaying products THEN the System SHALL validate each product UID against Gelato_API
2. WHEN a product UID is invalid THEN the System SHALL exclude it from the catalog display
3. THE System SHALL maintain the existing deactivated product filtering logic
4. WHEN TEST_MODE is disabled THEN the System SHALL only show production-ready products
5. THE System SHALL preserve the existing product transformation and grouping logic

### Requirement 8: Database Schema for Availability Tracking

**User Story:** As a developer, I want a database schema to track product availability, so that historical data is preserved and queryable.

#### Acceptance Criteria

1. THE System SHALL create a gelato_products table with columns: uid, name, type, status, last_seen, created_at, updated_at
2. THE System SHALL create a gelato_availability_history table with columns: product_uid, status, changed_at, notes
3. WHEN a product status changes THEN the System SHALL insert a record into gelato_availability_history
4. THE System SHALL create indexes on product_uid and status columns for query performance
5. WHEN querying products THEN the System SHALL support filtering by Availability_Status
