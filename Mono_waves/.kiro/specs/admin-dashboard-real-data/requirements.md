# Requirements Document

## Introduction

The admin dashboard currently displays hardcoded mock data for metrics, product catalogue, and order manifest. This feature will replace all mock data with real data fetched from the Supabase database, enabling administrators to view actual business metrics and operational data.

## Glossary

- **Dashboard**: The admin interface displaying business metrics and operational data
- **Metrics_Service**: The backend service that calculates and returns dashboard metrics
- **Product_Table**: The database table storing product information
- **Order_Table**: The database table storing order information
- **API_Route**: The Next.js API endpoint that serves dashboard data
- **Dashboard_Page**: The frontend React component that displays the dashboard

## Requirements

### Requirement 1: Fetch Real Metrics Data

**User Story:** As an administrator, I want to see real revenue, order count, and product count metrics, so that I can monitor actual business performance.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Metrics_Service SHALL fetch total revenue from the Order_Table
2. WHEN the Dashboard_Page loads, THE Metrics_Service SHALL fetch total order count from the Order_Table
3. WHEN the Dashboard_Page loads, THE Metrics_Service SHALL fetch published product count from the Product_Table
4. WHEN metrics are successfully fetched, THE Dashboard_Page SHALL display the real values in the metric cards
5. IF the metrics fetch fails, THEN THE Dashboard_Page SHALL display an error message and fallback to zero values

### Requirement 2: Display Real Product Catalogue

**User Story:** As an administrator, I want to see the actual products from the database in the Active Catalogue table, so that I can manage real inventory.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE API_Route SHALL fetch all published products from the Product_Table
2. WHEN products are fetched, THE Dashboard_Page SHALL display product name, price, and published status
3. WHEN a product has no stock information, THE Dashboard_Page SHALL display "N/A" for stock
4. WHEN products are successfully fetched, THE Dashboard_Page SHALL replace mock catalogue data with real data
5. IF the product fetch fails, THEN THE Dashboard_Page SHALL display an error message

### Requirement 3: Display Real Order Manifest

**User Story:** As an administrator, I want to see actual orders from the database in the Order Manifest table, so that I can track real customer orders.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE API_Route SHALL fetch recent orders from the Order_Table
2. WHEN orders are fetched, THE Dashboard_Page SHALL display order number, customer name, customer email, total amount, and status
3. WHEN orders are fetched, THE Dashboard_Page SHALL display the order creation date in a readable format
4. WHEN orders are successfully fetched, THE Dashboard_Page SHALL replace mock order data with real data
5. IF the order fetch fails, THEN THE Dashboard_Page SHALL display an error message

### Requirement 4: API Endpoint Enhancement

**User Story:** As a developer, I want the dashboard API endpoint to return all necessary data in a single request, so that the frontend can efficiently load the dashboard.

#### Acceptance Criteria

1. THE API_Route SHALL return metrics data including totalSales, totalOrders, totalProducts, and totalRevenue
2. THE API_Route SHALL return an array of recent products with id, name, price, published status, and created_at timestamp
3. THE API_Route SHALL return an array of recent orders with id, order_number, customer_name, customer_email, total, status, and created_at timestamp
4. WHEN database queries fail, THE API_Route SHALL return appropriate HTTP error codes
5. THE API_Route SHALL return data in JSON format

### Requirement 5: Loading and Error States

**User Story:** As an administrator, I want to see loading indicators and clear error messages, so that I understand the state of the dashboard at all times.

#### Acceptance Criteria

1. WHILE data is being fetched, THE Dashboard_Page SHALL display a loading indicator
2. WHEN data fetch completes successfully, THE Dashboard_Page SHALL hide the loading indicator and show the data
3. IF any data fetch fails, THEN THE Dashboard_Page SHALL display a user-friendly error message
4. WHEN an error occurs, THE Dashboard_Page SHALL log the error details to the console for debugging
5. THE Dashboard_Page SHALL handle partial failures gracefully by showing available data and errors for failed sections
