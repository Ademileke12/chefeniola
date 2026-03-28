# Dashboard API HTTP Status Codes

## Overview

This document describes the HTTP status code strategy for the `/api/admin/dashboard` endpoint, ensuring alignment with REST API best practices and providing clear guidance for API consumers.

## Status Code Strategy

### 200 OK - Successful Requests

The API returns `200 OK` in the following scenarios:

1. **Complete Success**: All database queries succeed and return data
   - Response includes full metrics, products, and orders
   - No `errors` field in response

2. **Partial Success**: Some queries fail but the API can return a valid response structure
   - Response includes available data with fallback values for failed queries
   - `errors` array field contains error messages for failed queries
   - Allows dashboard to display available data while showing errors for failed sections

3. **Empty Database**: All queries succeed but return no data
   - Response includes zero values for metrics and empty arrays for products/orders
   - This is a valid success state, not an error

**Rationale**: Returning 200 for partial success allows the frontend to gracefully degrade and display available information rather than showing a complete error state. This improves user experience when some data sources are temporarily unavailable.

### 500 Internal Server Error - Critical Failures

The API returns `500 Internal Server Error` only when:

1. **Uncaught Exceptions**: An unexpected error occurs that prevents the API from returning any valid response
   - Database client initialization failures
   - Unexpected runtime errors (TypeError, ReferenceError, etc.)
   - JSON serialization failures

2. **Critical System Failures**: The API cannot construct a valid response structure
   - Complete database connection failure at the client level
   - System-level errors that prevent normal operation

**Response Structure on 500**:
```json
{
  "error": "Critical server error occurred",
  "errors": ["Detailed error message"],
  "metrics": {
    "totalSales": 0,
    "totalOrders": 0,
    "totalProducts": 0,
    "totalRevenue": 0
  },
  "products": [],
  "orders": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Response Structure

### Successful Response (200)

```json
{
  "metrics": {
    "totalSales": 1250.00,
    "totalOrders": 15,
    "totalProducts": 8,
    "totalRevenue": 1500.00
  },
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "price": 29.99,
      "published": true,
      "gelato_product_uid": "GP001",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "total": 100.00,
      "status": "payment_confirmed",
      "created_at": "2024-01-01T10:00:00Z",
      "items": []
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Partial Success Response (200 with errors)

```json
{
  "metrics": {
    "totalSales": 0,
    "totalOrders": 0,
    "totalProducts": 5,
    "totalRevenue": 0
  },
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "price": 29.99,
      "published": true,
      "gelato_product_uid": "GP001",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "orders": [],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "errors": [
    "Failed to fetch orders metrics: Database connection timeout",
    "Failed to fetch recent orders: Query timeout"
  ]
}
```

### Error Response (500)

```json
{
  "error": "Critical server error occurred",
  "errors": ["Database client initialization failed"],
  "metrics": {
    "totalSales": 0,
    "totalOrders": 0,
    "totalProducts": 0,
    "totalRevenue": 0
  },
  "products": [],
  "orders": [],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Handling Best Practices

### For API Consumers (Frontend)

1. **Check Status Code First**
   ```typescript
   if (response.status === 200) {
     // Check for partial failures
     if (data.errors && data.errors.length > 0) {
       // Display available data + error messages
     } else {
       // Display all data normally
     }
   } else if (response.status === 500) {
     // Show critical error message
   }
   ```

2. **Handle Partial Failures Gracefully**
   - Display available data sections
   - Show error messages for failed sections
   - Provide retry functionality for failed queries

3. **Provide User Feedback**
   - Loading indicators during fetch
   - Clear error messages for failures
   - Success confirmation when data loads

### For API Developers

1. **Use Try-Catch for Critical Errors**
   - Wrap entire handler in try-catch
   - Return 500 only for uncaught exceptions

2. **Handle Query Errors Individually**
   - Catch errors for each database query
   - Add error messages to errors array
   - Continue processing other queries

3. **Provide Fallback Values**
   - Return zero values for failed metrics
   - Return empty arrays for failed data queries
   - Always include timestamp

4. **Log Errors Appropriately**
   - Use `console.error` for query failures
   - Use `console.warn` for partial success
   - Include error context for debugging

## REST API Alignment

This status code strategy aligns with REST API best practices:

- **200 OK**: Request succeeded, response contains requested data (even if partial)
- **500 Internal Server Error**: Server encountered an unexpected condition that prevented it from fulfilling the request

We do NOT use:
- **207 Multi-Status**: Not applicable for single resource endpoint
- **206 Partial Content**: Reserved for range requests
- **4xx Client Errors**: No client-side validation or authentication implemented yet

## Testing

Comprehensive tests verify the status code behavior:
- `__tests__/unit/api/dashboard-http-status-codes.test.ts`
- `__tests__/integration/admin-api.test.ts`

Tests cover:
- Complete success scenarios
- Partial failure scenarios
- Critical error scenarios
- Empty database scenarios
- Multiple query failure scenarios

## Future Considerations

1. **Authentication**: Add 401 Unauthorized when auth is implemented
2. **Rate Limiting**: Add 429 Too Many Requests if rate limiting is added
3. **Caching**: Add appropriate cache headers for 200 responses
4. **Monitoring**: Track partial failure rates to identify systemic issues
