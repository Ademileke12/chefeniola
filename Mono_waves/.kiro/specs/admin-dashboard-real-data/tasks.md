# Implementation Tasks

## Task 1: Enhance API Route to Return Complete Dashboard Data

### 1.1 Add Products Query to API Route
- [x] Add query to fetch recent published products from database
- [x] Include id, name, price, published, gelato_product_uid, created_at fields
- [x] Limit results to 10 most recent products
- [ ] Handle query errors appropriately

### 1.2 Add Orders Query to API Route  
- [x] Add query to fetch recent orders from database
- [x] Include id, order_number, customer_name, customer_email, total, status, created_at, items fields
- [x] Limit results to 10 most recent orders
- [ ] Handle query errors appropriately

### 1.3 Update API Response Structure
- [x] Modify response to include products array
- [x] Modify response to include orders array  
- [x] Maintain existing metrics structure
- [x] Add proper TypeScript types for response

### 1.4 Add Error Handling for New Queries
- [x] Handle products query failures gracefully
- [x] Handle orders query failures gracefully
- [x] Return appropriate HTTP status codes
- [x] Log errors for debugging

## Task 2: Update Dashboard Page to Fetch Real Data

### 2.1 Replace Mock Data with API Call
- [ ] Remove hardcoded mock metrics data
- [x] Remove hardcoded catalogue data array 
- [x] Remove hardcoded order data array
- [x] Implement fetch call to /api/admin/dashboard endpoint

### 2.2 Update State Management
- [x] Add state for products data
- [x] Add state for orders data
- [x] Add error state for data fetching
- [x] Update loading state logic

### 2.3 Handle API Response
- [x] Parse metrics from API response
- [x] Parse products array from API response
- [x] Parse orders array from API response
- [x] Update component state with real data

### 2.4 Add Error Handling
- [x] Display error message for failed API calls
- [x] Handle network errors gracefully
- [x] Provide fallback display for partial failures
- [x] Log errors to console for debugging

## Task 3: Transform Data for Table Display

### 3.1 Transform Products Data
- [x] Map gelato_product_uid to SKU column
- [x] Format price with currency symbol
- [x] Add placeholder stock status logic
- [x] Map published boolean to status display

### 3.2 Transform Orders Data
- [x] Format created_at date to readable string
- [x] Calculate item count from items JSONB array
- [x] Map order status to appropriate styling
- [x] Format total amount with currency

### 3.3 Update Table Column Definitions
- [x] Update catalogueColumns to handle real data structure
- [x] Update orderColumns to handle real data structure
- [x] Ensure proper data type handling
- [x] Add null/undefined checks for safety

## Task 4: Improve Loading and Error States

### 4.1 Enhanced Loading State
- [-] Show loading indicator during data fetch
- [ ] Disable interactions during loading
- [ ] Provide loading feedback for each section
- [ ] Handle loading state transitions properly

### 4.2 Comprehensive Error Handling
- [ ] Display user-friendly error messages
- [ ] Show specific errors for different failure types
- [ ] Provide retry functionality for failed requests
- [ ] Maintain partial functionality when possible

### 4.3 Empty State Handling
- [ ] Handle empty products array gracefully
- [ ] Handle empty orders array gracefully
- [ ] Display appropriate messages for empty data
- [ ] Ensure UI remains functional with no data

## Task 5: Add Type Safety and Validation

### 5.1 Define TypeScript Interfaces
- [ ] Create interface for API response structure
- [ ] Create interface for transformed table data
- [ ] Add proper typing for component props
- [ ] Update existing DashboardMetrics type if needed

### 5.2 Add Runtime Validation
- [ ] Validate API response structure
- [ ] Handle unexpected data formats gracefully
- [ ] Add type guards for data transformation
- [ ] Ensure type safety throughout data flow

### 5.3 Update Component Props
- [ ] Update DataTable component props if needed
- [ ] Ensure MetricCard receives proper data types
- [ ] Add proper typing for event handlers
- [ ] Maintain backward compatibility

## Task 6: Testing and Quality Assurance

### 6.1 Write Unit Tests
- [ ] Test API route with real database queries
- [ ] Test data transformation functions
- [ ] Test error handling scenarios
- [ ] Test component rendering with real data

### 6.2 Write Integration Tests
- [ ] Test complete dashboard data flow
- [ ] Test API endpoint error responses
- [ ] Test frontend error handling
- [ ] Test loading state behavior

### 6.3 Write Property-Based Tests
- [ ] Test data consistency property (revenue calculation)
- [ ] Test status mapping correctness property
- [ ] Test published products filter property
- [ ] Test data freshness property

### 6.4 Manual Testing
- [ ] Test dashboard with empty database
- [ ] Test dashboard with sample data
- [ ] Test error scenarios (database down, network issues)
- [ ] Verify UI responsiveness and usability


#from this image i uploaded i want the catalog to filter and only show the complete catalog of the following in the images 


i also want to be like in the prodcut creation page once the user clicks on that particular selection from the available catalog it should just automaticall fill the product name etc, but the price and be edited by users for profit after the intial product price, maybe the shirt is 20 bucks he can make it 40, because i don't think our current product creation is good, unlike gelato website uers can just access all the 