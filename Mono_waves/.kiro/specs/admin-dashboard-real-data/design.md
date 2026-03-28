# Design Document

## Overview

This design document outlines the implementation approach for replacing mock data with real database data in the admin dashboard. The solution involves enhancing the existing API endpoint and updating the frontend to consume real data.

## Architecture

### System Components

1. **Frontend Dashboard Page** (`app/admin/page.tsx`)
   - React component that displays dashboard UI
   - Manages loading and error states
   - Fetches data from API endpoint

2. **API Route** (`app/api/admin/dashboard/route.ts`)
   - Next.js API endpoint
   - Queries Supabase database
   - Returns structured JSON response

3. **Database Tables**
   - `products`: Product catalog data
   - `orders`: Order transaction data

## Data Flow

```
Dashboard Page → API Route → Supabase Database
             ← JSON Response ←
```

## API Design

### Enhanced Dashboard Endpoint

**Endpoint:** `GET /api/admin/dashboard`

**Response Structure:**
```typescript
{
  metrics: {
    totalSales: number,
    totalOrders: number, 
    totalProducts: number,
    totalRevenue: number
  },
  products: Array<{
    id: string,
    name: string,
    price: number,
    published: boolean,
    gelato_product_uid: string, // Used as SKU
    created_at: string
  }>,
  orders: Array<{
    id: string,
    order_number: string,
    customer_name: string,
    customer_email: string,
    total: number,
    status: string,
    created_at: string,
    items: any[] // JSONB array
  }>,
  timestamp: string
}
```

## Database Queries

### Metrics Calculation
- **Total Sales**: Sum of `total` from orders with completed statuses
- **Total Orders**: Count of all orders
- **Total Products**: Count of published products
- **Total Revenue**: Sum of all order totals

### Products Query
```sql
SELECT id, name, price, published, gelato_product_uid, created_at
FROM products 
WHERE published = true
ORDER BY created_at DESC
LIMIT 10
```

### Orders Query
```sql
SELECT id, order_number, customer_name, customer_email, total, status, created_at, items
FROM orders
ORDER BY created_at DESC
LIMIT 10
```

## Frontend Implementation

### State Management
```typescript
interface DashboardData {
  metrics: DashboardMetrics | null
  products: Product[] | null
  orders: Order[] | null
  loading: boolean
  error: string | null
}
```

### Data Fetching Strategy
1. Single API call on component mount
2. Loading state during fetch
3. Error handling with fallback display
4. Success state with real data rendering

### Table Data Transformation

#### Products Table
- Map `gelato_product_uid` to SKU column
- Calculate stock status (placeholder for now)
- Format price with currency symbol

#### Orders Table  
- Format date to readable string
- Map order status to appropriate styling
- Calculate item count from items array

## Error Handling

### API Level
- Database connection errors → 500 status
- Query errors → 500 status with error details
- Validation errors → 400 status

### Frontend Level
- Network errors → Display "Connection failed" message
- API errors → Display error from response
- Partial failures → Show available data + error for failed sections

## Performance Considerations

1. **Pagination**: Limit results to recent 10 items for tables
2. **Caching**: Consider adding cache headers for metrics
3. **Indexing**: Leverage existing database indexes for performance

## Security

1. **Authentication**: Add admin authentication check to API route
2. **Authorization**: Verify admin role before returning data
3. **Data Sanitization**: Sanitize customer data in responses

## Correctness Properties

### Property 1: Data Consistency
**Validates: Requirements 1.1, 1.2, 1.3**
For any dashboard load, the sum of individual order totals must equal the total revenue metric.

### Property 2: Status Mapping Correctness  
**Validates: Requirements 3.2, 3.4**
For any order displayed, the status value must be one of the valid order statuses defined in the database schema.

### Property 3: Published Products Filter
**Validates: Requirements 2.1, 2.4**
For any product displayed in the catalogue, the published field must be true.

### Property 4: Data Freshness
**Validates: Requirements 2.1, 3.1**
For any dashboard load, the displayed data must reflect the current database state within acceptable time bounds.

## Testing Strategy

### Unit Tests
- API route response structure validation
- Data transformation logic
- Error handling scenarios

### Integration Tests  
- End-to-end dashboard data flow
- Database query correctness
- API error response handling

### Property-Based Tests
- Data consistency properties
- Status mapping validation
- Filter correctness verification