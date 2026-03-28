# Design Document: Mono Waves E-Commerce Platform

## Overview

Mono Waves is a full-stack print-on-demand e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS. The system integrates three core services: Gelato API for product fulfillment, Stripe for payment processing, and Supabase for data persistence and file storage.

The architecture follows a modern serverless approach using Next.js API routes for backend logic, with a clear separation between customer-facing storefront and administrative dashboard. The design emphasizes guest checkout flow, automated order fulfillment, and real-time order tracking.

**Key Design Principles:**
- Mobile-first responsive design following provided UI mockups
- Guest-first checkout (no account creation required)
- Automated order fulfillment pipeline
- Webhook-driven status updates
- Secure payment processing
- Scalable serverless architecture

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │  Storefront (Next.js)│  │ Admin Dashboard (Next.js)│    │
│  │  - Product Browsing  │  │  - Product Management    │    │
│  │  - Cart Management   │  │  - Order Management      │    │
│  │  - Guest Checkout    │  │  - Analytics Dashboard   │    │
│  │  - Order Tracking    │  │  - Settings              │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer (Next.js API Routes)      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Product    │  │    Order     │  │   Payment    │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Cart      │  │   Webhook    │  │    File      │     │
│  │   Service    │  │   Handler    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Integration Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Gelato API  │  │  Stripe API  │  │   Supabase   │     │
│  │  - Products  │  │  - Checkout  │  │  - Database  │     │
│  │  - Orders    │  │  - Webhooks  │  │  - Storage   │     │
│  │  - Webhooks  │  │  - Payments  │  │  - Auth      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Hook Form (form validation)
- Zustand (state management for cart)
- SWR (data fetching and caching)

**Backend:**
- Next.js API Routes
- TypeScript
- Stripe SDK
- Gelato API Client
- Supabase Client

**Database & Storage:**
- Supabase PostgreSQL
- Supabase Storage (design files)

**External Services:**
- Gelato API (print-on-demand fulfillment)
- Stripe (payment processing)

**Deployment:**
- Vercel (frontend and API routes)
- Supabase (managed database and storage)

## Components and Interfaces

### Frontend Components

#### Storefront Components

**Navigation Components:**
```typescript
// components/storefront/Header.tsx
interface HeaderProps {
  cartItemCount: number;
}

// components/storefront/Footer.tsx
interface FooterProps {
  // Minimal footer with links
}
```

**Product Components:**
```typescript
// components/storefront/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onQuickView?: () => void;
}

// components/storefront/ProductGrid.tsx
interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

// components/storefront/ProductGallery.tsx
interface ProductGalleryProps {
  images: string[];
  productName: string;
}

// components/storefront/ProductOptions.tsx
interface ProductOptionsProps {
  sizes: string[];
  colors: ProductColor[];
  selectedSize: string;
  selectedColor: string;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
}
```

**Cart Components:**
```typescript
// components/storefront/CartItem.tsx
interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

// components/storefront/CartSummary.tsx
interface CartSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
}
```

**Checkout Components:**
```typescript
// components/storefront/CheckoutForm.tsx
interface CheckoutFormProps {
  cartItems: CartItem[];
  onSubmit: (data: CheckoutData) => Promise<void>;
}

// components/storefront/OrderSummary.tsx
interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}
```

**Tracking Components:**
```typescript
// components/storefront/TrackOrderForm.tsx
interface TrackOrderFormProps {
  onSubmit: (email: string, orderId: string) => Promise<void>;
}

// components/storefront/OrderStatus.tsx
interface OrderStatusProps {
  order: Order;
}
```

#### Admin Dashboard Components

**Layout Components:**
```typescript
// components/admin/Sidebar.tsx
interface SidebarProps {
  activeSection: string;
}

// components/admin/DashboardLayout.tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
}
```

**Dashboard Components:**
```typescript
// components/admin/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

// components/admin/RevenueChart.tsx
interface RevenueChartProps {
  data: RevenueData[];
}
```

**Product Management Components:**
```typescript
// components/admin/ProductTable.tsx
interface ProductTableProps {
  products: Product[];
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
}

// components/admin/ProductForm.tsx
interface ProductFormProps {
  product?: Product;
  gelatoProducts: GelatoProduct[];
  onSubmit: (data: ProductFormData) => Promise<void>;
}

// components/admin/DesignUploader.tsx
interface DesignUploaderProps {
  onUpload: (file: File) => Promise<string>;
  currentDesignUrl?: string;
}

// components/admin/MockupPreview.tsx
interface MockupPreviewProps {
  productUid: string;
  designUrl: string;
}
```

**Order Management Components:**
```typescript
// components/admin/OrderTable.tsx
interface OrderTableProps {
  orders: Order[];
  onViewDetails: (orderId: string) => void;
}

// components/admin/OrderDetails.tsx
interface OrderDetailsProps {
  order: Order;
}

// components/admin/OrderFilters.tsx
interface OrderFiltersProps {
  onFilterChange: (filters: OrderFilters) => void;
}
```

### Backend Services

#### Product Service

```typescript
// lib/services/productService.ts

interface ProductService {
  // Fetch all published products
  getPublishedProducts(): Promise<Product[]>;
  
  // Get single product by ID
  getProductById(id: string): Promise<Product | null>;
  
  // Admin: Get all products (including unpublished)
  getAllProducts(): Promise<Product[]>;
  
  // Admin: Create new product
  createProduct(data: CreateProductData): Promise<Product>;
  
  // Admin: Update product
  updateProduct(id: string, data: UpdateProductData): Promise<Product>;
  
  // Admin: Delete product
  deleteProduct(id: string): Promise<void>;
  
  // Admin: Publish product
  publishProduct(id: string): Promise<Product>;
  
  // Filter products
  filterProducts(filters: ProductFilters): Promise<Product[]>;
}
```

#### Gelato Service

```typescript
// lib/services/gelatoService.ts

interface GelatoService {
  // Fetch product catalog
  getProductCatalog(): Promise<GelatoProduct[]>;
  
  // Get product details
  getProductDetails(productUid: string): Promise<GelatoProductDetails>;
  
  // Upload design file
  uploadDesign(file: Buffer, filename: string): Promise<string>;
  
  // Create order
  createOrder(orderData: GelatoOrderData): Promise<GelatoOrderResponse>;
  
  // Get order status
  getOrderStatus(gelatoOrderId: string): Promise<GelatoOrderStatus>;
  
  // Cancel order
  cancelOrder(gelatoOrderId: string): Promise<void>;
}

interface GelatoOrderData {
  orderReferenceId: string;
  customerReferenceId: string;
  currency: string;
  items: GelatoOrderItem[];
  shipmentMethodUid: string;
  shippingAddress: ShippingAddress;
}

interface GelatoOrderItem {
  itemReferenceId: string;
  productUid: string;
  files: Array<{
    type: 'default' | 'back';
    url: string;
  }>;
  quantity: number;
}
```

#### Stripe Service

```typescript
// lib/services/stripeService.ts

interface StripeService {
  // Create checkout session
  createCheckoutSession(data: CheckoutSessionData): Promise<string>;
  
  // Verify webhook signature
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): Stripe.Event;
  
  // Handle payment success
  handlePaymentSuccess(session: Stripe.Checkout.Session): Promise<void>;
  
  // Handle payment failure
  handlePaymentFailure(session: Stripe.Checkout.Session): Promise<void>;
}

interface CheckoutSessionData {
  cartItems: CartItem[];
  customerEmail: string;
  shippingAddress: ShippingAddress;
  successUrl: string;
  cancelUrl: string;
}
```

#### Order Service

```typescript
// lib/services/orderService.ts

interface OrderService {
  // Create order after payment
  createOrder(data: CreateOrderData): Promise<Order>;
  
  // Get order by ID
  getOrderById(id: string): Promise<Order | null>;
  
  // Track order (guest)
  trackOrder(email: string, orderId: string): Promise<Order | null>;
  
  // Admin: Get all orders
  getAllOrders(filters?: OrderFilters): Promise<Order[]>;
  
  // Update order status
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    trackingData?: TrackingData
  ): Promise<Order>;
  
  // Submit order to Gelato
  submitToGelato(orderId: string): Promise<void>;
}

interface CreateOrderData {
  customerEmail: string;
  stripePaymentId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  total: number;
}
```

#### Cart Service

```typescript
// lib/services/cartService.ts

interface CartService {
  // Get cart by session ID
  getCart(sessionId: string): Promise<Cart | null>;
  
  // Add item to cart
  addItem(sessionId: string, item: CartItem): Promise<Cart>;
  
  // Update item quantity
  updateItemQuantity(
    sessionId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart>;
  
  // Remove item from cart
  removeItem(sessionId: string, itemId: string): Promise<Cart>;
  
  // Clear cart
  clearCart(sessionId: string): Promise<void>;
  
  // Calculate cart total
  calculateTotal(cart: Cart): number;
}
```

#### File Service

```typescript
// lib/services/fileService.ts

interface FileService {
  // Upload design file to Supabase Storage
  uploadDesign(file: File): Promise<string>;
  
  // Delete design file
  deleteDesign(url: string): Promise<void>;
  
  // Validate file
  validateDesignFile(file: File): ValidationResult;
  
  // Get public URL
  getPublicUrl(path: string): string;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
```

### API Routes

```typescript
// app/api/products/route.ts
GET /api/products - Get all published products
POST /api/products - Create product (admin)

// app/api/products/[id]/route.ts
GET /api/products/[id] - Get product by ID
PUT /api/products/[id] - Update product (admin)
DELETE /api/products/[id] - Delete product (admin)

// app/api/products/[id]/publish/route.ts
POST /api/products/[id]/publish - Publish product (admin)

// app/api/gelato/catalog/route.ts
GET /api/gelato/catalog - Get Gelato product catalog (admin)

// app/api/gelato/product/[uid]/route.ts
GET /api/gelato/product/[uid] - Get Gelato product details (admin)

// app/api/cart/route.ts
GET /api/cart?sessionId=xxx - Get cart
POST /api/cart - Add item to cart
PUT /api/cart - Update cart item
DELETE /api/cart - Remove cart item

// app/api/checkout/route.ts
POST /api/checkout - Create Stripe checkout session

// app/api/orders/route.ts
GET /api/orders - Get all orders (admin)
POST /api/orders - Create order

// app/api/orders/[id]/route.ts
GET /api/orders/[id] - Get order by ID

// app/api/orders/track/route.ts
POST /api/orders/track - Track order (guest)

// app/api/webhooks/stripe/route.ts
POST /api/webhooks/stripe - Handle Stripe webhooks

// app/api/webhooks/gelato/route.ts
POST /api/webhooks/gelato - Handle Gelato webhooks

// app/api/upload/route.ts
POST /api/upload - Upload design file (admin)

// app/api/admin/dashboard/route.ts
GET /api/admin/dashboard - Get dashboard metrics (admin)
```

## Data Models

### Database Schema

```sql
-- Users table (for admin authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  gelato_product_id TEXT NOT NULL,
  gelato_product_uid TEXT NOT NULL,
  sizes TEXT[] NOT NULL,
  colors JSONB NOT NULL,
  design_url TEXT NOT NULL,
  mockup_urls JSONB,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_published ON products(published);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  stripe_payment_id TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT,
  gelato_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  carrier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Cart table (session-based)
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_carts_session_id ON carts(session_id);
CREATE INDEX idx_carts_expires_at ON carts(expires_at);

-- Webhook logs (for debugging)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);
```

### TypeScript Interfaces

```typescript
// types/product.ts
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  gelatoProductId: string;
  gelatoProductUid: string;
  sizes: string[];
  colors: ProductColor[];
  designUrl: string;
  mockupUrls?: Record<string, string>;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductColor {
  name: string;
  hex: string;
  imageUrl?: string;
}

interface GelatoProduct {
  uid: string;
  title: string;
  description: string;
  availableSizes: string[];
  availableColors: GelatoColor[];
  basePrice: number;
}

interface GelatoColor {
  name: string;
  code: string;
}

// types/order.ts
interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  stripePaymentId: string;
  stripeSessionId?: string;
  gelatoOrderId?: string;
  status: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  designUrl: string;
  gelatoProductUid: string;
}

type OrderStatus = 
  | 'pending'
  | 'payment_confirmed'
  | 'submitted_to_gelato'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  phone: string;
}

// types/cart.ts
interface Cart {
  id: string;
  sessionId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  imageUrl: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Product Management Properties

**Property 1: Product CRUD Consistency**
*For any* valid product data, creating a product then retrieving it should return equivalent product data with published status set to false.
**Validates: Requirements 1.4**

**Property 2: Product Publishing State Transition**
*For any* unpublished product, publishing it should update the published status to true and make it appear in public product queries.
**Validates: Requirements 1.5**

**Property 3: Product Update Persistence**
*For any* existing product and any valid update data, updating the product then retrieving it should return the updated values.
**Validates: Requirements 1.6**

**Property 4: Product Deletion Completeness**
*For any* product, after deletion, attempting to retrieve that product should return null and it should not appear in any product listings.
**Validates: Requirements 1.7**

**Property 5: Gelato Product Catalog Retrieval**
*For any* request to fetch the Gelato product catalog, the system should return a non-empty list of products with valid UIDs, titles, and available options.
**Validates: Requirements 1.2, 2.1**

### Product Configuration Properties

**Property 6: Price Validation**
*For any* price value less than or equal to zero, the system should reject the product creation or update with a validation error.
**Validates: Requirements 2.4**

**Property 7: Design File Validation**
*For any* file that is not an image format (JPEG, PNG, SVG, PDF), the system should reject the upload with a validation error.
**Validates: Requirements 2.2, 14.1**

**Property 8: Design File Upload Round Trip**
*For any* valid design file, uploading it should return a publicly accessible URL, and fetching that URL should return the original file content.
**Validates: Requirements 1.3, 14.2, 14.3**

**Property 9: Product Configuration Persistence**
*For any* product with selected sizes and colors, storing the product then retrieving it should return the same size and color options.
**Validates: Requirements 2.5, 2.6, 14.4**

### Customer Browsing Properties

**Property 10: Published Products Filter**
*For any* query to fetch products for the storefront, all returned products should have published status set to true.
**Validates: Requirements 3.2**

**Property 11: Product Filtering Correctness**
*For any* filter criteria (size, color, price range), all returned products should match all specified filter conditions.
**Validates: Requirements 3.3**

**Property 12: Product Sorting Correctness**
*For any* sort option (price ascending, price descending, newest first), the returned products should be ordered according to the specified sort criteria.
**Validates: Requirements 3.4**

**Property 13: Product Detail Completeness**
*For any* product displayed on the detail page, all required fields (name, description, price, images, sizes, colors) should be present and non-empty.
**Validates: Requirements 4.1, 4.2**

**Property 14: Quantity Validation**
*For any* quantity value less than or equal to zero, the system should reject the add-to-cart operation with a validation error.
**Validates: Requirements 4.5**

### Shopping Cart Properties

**Property 15: Cart Item Persistence**
*For any* session ID and cart item, adding the item to the cart then retrieving the cart should include that item with correct product details and quantity.
**Validates: Requirements 5.1, 5.2**

**Property 16: Cart Subtotal Calculation**
*For any* cart with items, the subtotal should equal the sum of (price × quantity) for all items in the cart.
**Validates: Requirements 5.3**

**Property 17: Cart Item Removal**
*For any* cart item, removing it from the cart then retrieving the cart should not include that item.
**Validates: Requirements 5.4**

**Property 18: Cart Session Persistence**
*For any* session ID with cart items, the cart should persist across requests and remain accessible using the same session ID.
**Validates: Requirements 5.6**

### Checkout and Payment Properties

**Property 19: Checkout Form Validation**
*For any* shipping address form submission with missing required fields, the system should reject the submission with specific validation errors for each missing field.
**Validates: Requirements 6.2**

**Property 20: Order Summary Accuracy**
*For any* cart at checkout, the order summary should display all cart items with correct quantities, prices, and a total that equals subtotal plus shipping cost.
**Validates: Requirements 6.3, 17.4**

**Property 21: Stripe Checkout Session Creation**
*For any* valid checkout data (cart items, customer email, shipping address), the system should create a Stripe checkout session and return a valid session URL.
**Validates: Requirements 6.4, 7.1**

**Property 22: Webhook Signature Verification**
*For any* webhook request (Stripe or Gelato) with an invalid signature, the system should reject the request and not process the webhook payload.
**Validates: Requirements 7.3, 10.2, 20.1**

**Property 23: Payment Confirmation Order Creation**
*For any* successful Stripe payment webhook, the system should create an order record in the database with status "payment_confirmed" and all order details from the checkout session.
**Validates: Requirements 7.4**

### Order Fulfillment Properties

**Property 24: Gelato Order Submission**
*For any* order with status "payment_confirmed", submitting to Gelato should include all required fields (product UID, design URL, shipping address, quantities) and return a Gelato order ID.
**Validates: Requirements 8.1, 8.2, 8.3**

**Property 25: Gelato Order ID Storage**
*For any* successful Gelato order submission, the system should store the returned Gelato order ID in the order record and update the status to "submitted_to_gelato".
**Validates: Requirements 8.4**

**Property 26: Order Status Update Propagation**
*For any* valid Gelato webhook with status update, the system should update the corresponding order's status in the database to match the webhook status.
**Validates: Requirements 10.3**

**Property 27: Tracking Information Storage**
*For any* Gelato webhook containing tracking number and carrier, the system should store both values in the order record and make them queryable.
**Validates: Requirements 10.4, 10.5**

### Order Tracking Properties

**Property 28: Order Tracking Validation**
*For any* email and order ID combination that does not match an existing order, the system should return an error indicating invalid tracking information.
**Validates: Requirements 9.2**

**Property 29: Order Tracking Information Completeness**
*For any* valid email and order ID combination, the system should return the order with all details including status, items, shipping address, and tracking information if available.
**Validates: Requirements 9.3, 9.4**

### Admin Dashboard Properties

**Property 30: Dashboard Metrics Accuracy**
*For any* set of orders and products in the database, the dashboard metrics (total sales, order count, product count, revenue) should accurately reflect the current database state.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

**Property 31: Order Filtering Correctness**
*For any* order status filter, all returned orders should have the specified status and no orders with different statuses should be included.
**Validates: Requirements 12.3**

**Property 32: Order Search Correctness**
*For any* search query (order number, customer email), all returned orders should match the search criteria.
**Validates: Requirements 12.5**

**Property 33: Order Detail Completeness**
*For any* order viewed in the admin dashboard, all order information (items, shipping address, status, tracking) should be displayed.
**Validates: Requirements 12.4**

### Data Integrity Properties

**Property 34: Database Transaction Rollback**
*For any* database operation that fails partway through, the system should roll back all changes and leave the database in its previous consistent state.
**Validates: Requirements 18.2**

**Property 35: File Upload Verification**
*For any* file upload operation, the system should verify successful storage before returning a URL, and failed uploads should not return URLs.
**Validates: Requirements 18.3**

**Property 36: Concurrent Update Safety**
*For any* two concurrent updates to the same resource, the system should process them sequentially and prevent data conflicts or lost updates.
**Validates: Requirements 18.5**

### Error Handling Properties

**Property 37: Validation Error Specificity**
*For any* validation error, the system should return a specific error message that identifies which field failed validation and why.
**Validates: Requirements 19.1**

**Property 38: API Error Logging**
*For any* failed API request (Gelato or Stripe), the system should log the error details including request data, response status, and error message.
**Validates: Requirements 19.2**

**Property 39: User-Friendly Error Messages**
*For any* error displayed to users, the error message should be user-friendly and should not expose internal system details, API keys, or stack traces.
**Validates: Requirements 19.3, 19.4**

**Property 40: Input Sanitization**
*For any* user input (form fields, query parameters), the system should sanitize the input to prevent SQL injection, XSS, and other injection attacks.
**Validates: Requirements 20.5**

### UI Consistency Properties

**Property 41: Navigation Bar Presence**
*For any* page in the storefront, the navigation bar should be present and contain logo, shop links, track order link, and cart icon.
**Validates: Requirements 16.1**

**Property 42: Responsive Functionality Preservation**
*For any* viewport size (mobile, tablet, desktop), all core functionality (browsing, cart, checkout, tracking) should remain operational.
**Validates: Requirements 15.4**

**Property 43: Image Optimization**
*For any* product image displayed, the image URL should include appropriate size parameters based on the display context.
**Validates: Requirements 15.5**

## Error Handling

### Error Categories

**Validation Errors:**
- Invalid product data (missing fields, invalid price, invalid file format)
- Invalid cart operations (quantity <= 0, product not found)
- Invalid checkout data (missing required fields, invalid email format)
- Invalid tracking information (email/order ID mismatch)

**Integration Errors:**
- Gelato API failures (network errors, invalid product UID, order rejection)
- Stripe API failures (payment declined, session creation failure)
- Supabase errors (database connection, query failures, storage errors)

**Business Logic Errors:**
- Attempting to publish already published product
- Attempting to delete product with active orders
- Attempting to submit order to Gelato before payment confirmation
- Attempting to access admin features without authentication

### Error Handling Strategy

**Client-Side Error Handling:**
```typescript
// Form validation errors
interface ValidationError {
  field: string;
  message: string;
}

// API error responses
interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// Error display component
<ErrorMessage error={error} />
```

**Server-Side Error Handling:**
```typescript
// API route error handler
try {
  // Operation
} catch (error) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.details },
      { status: 400 }
    );
  }
  
  if (error instanceof GelatoApiError) {
    logger.error('Gelato API error', { error, context });
    return NextResponse.json(
      { error: 'Fulfillment service error' },
      { status: 502 }
    );
  }
  
  // Generic error
  logger.error('Unexpected error', { error, context });
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}
```

**Webhook Error Handling:**
```typescript
// Stripe webhook handler
try {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  );
  
  await processStripeEvent(event);
  
  return NextResponse.json({ received: true });
} catch (error) {
  logger.error('Webhook processing failed', { error });
  
  // Return 200 to prevent Stripe retries for invalid signatures
  if (error instanceof SignatureVerificationError) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Return 500 for processing errors to trigger Stripe retry
  return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
}
```

**Database Error Handling:**
```typescript
// Transaction with rollback
const { data, error } = await supabase.rpc('create_order_transaction', {
  order_data: orderData
});

if (error) {
  logger.error('Order creation failed', { error });
  throw new DatabaseError('Failed to create order');
}
```

### Error Recovery

**Retry Logic:**
- Gelato API calls: 3 retries with exponential backoff
- Stripe API calls: Use Stripe SDK's built-in retry logic
- Database operations: Single retry for transient errors

**Webhook Retry Handling:**
- Stripe webhooks: Stripe automatically retries failed webhooks
- Gelato webhooks: Gelato automatically retries failed webhooks
- Idempotent webhook processing to handle duplicate deliveries

**User-Facing Error Recovery:**
- Payment failures: Redirect to cart with error message
- Checkout errors: Display inline validation errors
- Tracking errors: Display "Order not found" message with support contact

## Testing Strategy

### Testing Approach

The Mono Waves platform requires a comprehensive testing strategy that combines unit tests for specific examples and edge cases with property-based tests for universal correctness properties. This dual approach ensures both concrete functionality and general correctness across all possible inputs.

### Property-Based Testing

**Library Selection:**
- **JavaScript/TypeScript**: fast-check (https://github.com/dubzzz/fast-check)
- Mature library with excellent TypeScript support
- Provides arbitraries for generating test data
- Supports async property testing for API calls

**Configuration:**
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `// Feature: mono-waves-ecommerce, Property N: [property text]`

**Property Test Examples:**

```typescript
// Property 1: Product CRUD Consistency
import fc from 'fast-check';

describe('Product Management Properties', () => {
  it('Property 1: Product CRUD Consistency', async () => {
    // Feature: mono-waves-ecommerce, Property 1: Product CRUD Consistency
    await fc.assert(
      fc.asyncProperty(
        productArbitrary(),
        async (productData) => {
          const created = await productService.createProduct(productData);
          const retrieved = await productService.getProductById(created.id);
          
          expect(retrieved).toBeDefined();
          expect(retrieved.name).toBe(productData.name);
          expect(retrieved.price).toBe(productData.price);
          expect(retrieved.published).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 16: Cart Subtotal Calculation
  it('Property 16: Cart Subtotal Calculation', async () => {
    // Feature: mono-waves-ecommerce, Property 16: Cart Subtotal Calculation
    await fc.assert(
      fc.asyncProperty(
        cartWithItemsArbitrary(),
        async (cart) => {
          const expectedSubtotal = cart.items.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
          );
          
          const calculatedSubtotal = cartService.calculateTotal(cart);
          
          expect(calculatedSubtotal).toBe(expectedSubtotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Arbitraries for generating test data
function productArbitrary() {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ maxLength: 500 }),
    price: fc.float({ min: 0.01, max: 1000, noNaN: true }),
    gelatoProductUid: fc.string(),
    sizes: fc.array(fc.constantFrom('S', 'M', 'L', 'XL'), { minLength: 1 }),
    colors: fc.array(colorArbitrary(), { minLength: 1 }),
    designUrl: fc.webUrl()
  });
}

function cartWithItemsArbitrary() {
  return fc.record({
    sessionId: fc.uuid(),
    items: fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 10 })
  });
}
```

### Unit Testing

**Library Selection:**
- **Testing Framework**: Jest
- **React Testing**: React Testing Library
- **API Testing**: Supertest for API route testing

**Unit Test Focus Areas:**

1. **Component Tests:**
   - Specific UI interactions (button clicks, form submissions)
   - Edge cases (empty cart, out of stock)
   - Error state rendering

2. **Integration Tests:**
   - Stripe webhook processing
   - Gelato API integration
   - Database transactions

3. **Example-Based Tests:**
   - Specific checkout flows
   - Specific order tracking scenarios
   - Specific admin operations

**Unit Test Examples:**

```typescript
// Cart component tests
describe('CartItem Component', () => {
  it('should display product details correctly', () => {
    const item = {
      productName: 'Test T-Shirt',
      size: 'M',
      color: 'Blue',
      quantity: 2,
      price: 29.99
    };
    
    render(<CartItem item={item} />);
    
    expect(screen.getByText('Test T-Shirt')).toBeInTheDocument();
    expect(screen.getByText('Size: M')).toBeInTheDocument();
    expect(screen.getByText('Color: Blue')).toBeInTheDocument();
    expect(screen.getByText('$59.98')).toBeInTheDocument();
  });
  
  it('should handle quantity update', async () => {
    const onUpdateQuantity = jest.fn();
    const item = { /* ... */ };
    
    render(<CartItem item={item} onUpdateQuantity={onUpdateQuantity} />);
    
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '3');
    
    expect(onUpdateQuantity).toHaveBeenCalledWith(3);
  });
});

// Stripe webhook integration test
describe('Stripe Webhook Handler', () => {
  it('should create order on successful payment', async () => {
    const mockSession = {
      id: 'cs_test_123',
      payment_status: 'paid',
      customer_email: '[email protected]',
      metadata: {
        cartItems: JSON.stringify([/* items */]),
        shippingAddress: JSON.stringify({/* address */})
      }
    };
    
    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', generateValidSignature(mockSession))
      .send(mockSession);
    
    expect(response.status).toBe(200);
    
    const order = await orderService.getOrderByStripeSessionId(mockSession.id);
    expect(order).toBeDefined();
    expect(order.status).toBe('payment_confirmed');
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 43 correctness properties implemented
- **Integration Test Coverage**: All external API integrations tested
- **E2E Test Coverage**: Critical user flows (browse → cart → checkout → track)

### Testing Workflow

1. **Development**: Write unit tests alongside implementation
2. **Property Tests**: Implement property tests after core functionality is complete
3. **Integration Tests**: Test external integrations with mocked responses
4. **E2E Tests**: Test complete user flows in staging environment
5. **CI/CD**: Run all tests on every commit

### Mock Data and Test Fixtures

```typescript
// Test fixtures for consistent testing
export const testFixtures = {
  products: {
    tshirt: {
      name: 'Classic T-Shirt',
      price: 29.99,
      gelatoProductUid: 'apparel_product_gca_t-shirt_...',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Black', hex: '#000000' }
      ]
    }
  },
  orders: {
    completed: {
      orderNumber: 'MW-2024-001',
      status: 'delivered',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS'
    }
  },
  webhooks: {
    stripePaymentSuccess: {
      type: 'checkout.session.completed',
      data: {/* ... */}
    },
    gelatoOrderShipped: {
      type: 'order.shipped',
      data: {/* ... */}
    }
  }
};
```

## Deployment and Infrastructure

### Deployment Architecture

**Frontend and API Routes:**
- Platform: Vercel
- Region: Auto (edge network)
- Build: Next.js production build
- Environment: Node.js 18+

**Database and Storage:**
- Platform: Supabase
- Database: PostgreSQL 15
- Storage: Supabase Storage (S3-compatible)
- Region: Closest to primary user base

**External Services:**
- Gelato API: Production endpoint
- Stripe: Production API keys
- Webhooks: Configured to point to production URLs

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gelato
GELATO_API_KEY=...
GELATO_WEBHOOK_SECRET=...

# Application
NEXT_PUBLIC_APP_URL=https://monowaves.com
SESSION_SECRET=...

# Admin
ADMIN_EMAIL=admin@monowaves.com
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:property
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Monitoring and Logging

**Application Monitoring:**
- Vercel Analytics for performance metrics
- Error tracking with Sentry or similar
- Custom logging for business events

**Webhook Monitoring:**
- Log all webhook receipts to database
- Alert on webhook processing failures
- Dashboard for webhook status

**Database Monitoring:**
- Supabase built-in monitoring
- Query performance tracking
- Connection pool monitoring

### Scaling Considerations

**Horizontal Scaling:**
- Vercel automatically scales frontend and API routes
- Supabase handles database scaling
- No server management required

**Performance Optimization:**
- Image optimization with Next.js Image component
- API route caching where appropriate
- Database query optimization with indexes
- CDN for static assets

**Cost Optimization:**
- Vercel: Pay-per-use serverless functions
- Supabase: Database size and bandwidth
- Stripe: Per-transaction fees
- Gelato: Per-order fulfillment costs

## Security Considerations

### Authentication and Authorization

**Admin Authentication:**
- Supabase Auth for admin login
- JWT-based session management
- Role-based access control (admin role required)

**API Route Protection:**
```typescript
// Middleware for admin routes
export async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return user;
}
```

### Data Protection

**Sensitive Data Handling:**
- API keys stored in environment variables
- Customer data encrypted at rest (Supabase default)
- Payment data handled by Stripe (PCI compliant)
- No credit card data stored in our database

**Input Validation:**
- All user inputs validated and sanitized
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection via SameSite cookies

### Webhook Security

**Signature Verification:**
```typescript
// Stripe webhook verification
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Gelato webhook verification
const gelatoSignature = req.headers.get('x-gelato-signature');
const isValid = verifyGelatoSignature(body, gelatoSignature);
```

**Idempotency:**
- Webhook events processed idempotently
- Duplicate webhook deliveries handled gracefully
- Event IDs tracked to prevent double-processing

### Rate Limiting

**API Route Rate Limiting:**
- Implement rate limiting for public endpoints
- Prevent abuse of cart and checkout endpoints
- Protect admin endpoints from brute force

**External API Rate Limits:**
- Respect Gelato API rate limits
- Respect Stripe API rate limits
- Implement exponential backoff for retries

## Future Enhancements

### Phase 2 Features

**Customer Accounts:**
- User registration and login
- Order history
- Saved addresses
- Wishlist functionality

**Product Personalization:**
- Live preview of custom text on products
- Multiple design upload options
- Design templates

**Email Notifications:**
- Order confirmation emails
- Shipping notification emails
- Delivery confirmation emails

**Analytics Dashboard:**
- Sales trends over time
- Popular products
- Customer demographics
- Revenue forecasting

### Phase 3 Features

**Multi-Currency Support:**
- Automatic currency conversion
- Region-specific pricing
- International shipping options

**Inventory Management:**
- Stock level tracking
- Low stock alerts
- Automatic reordering

**Marketing Features:**
- Discount codes
- Promotional campaigns
- Abandoned cart recovery
- Product recommendations

**Advanced Admin Features:**
- Bulk product upload
- CSV export/import
- Advanced reporting
- Customer support ticketing

