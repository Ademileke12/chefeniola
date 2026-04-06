# Checkout Debugging Guide

## Current Issue
Getting 502 error with Stripe API returning 400 status code.

## Debugging Steps

### 1. Check Server Logs
Look at your terminal where `npm run dev` is running. You should now see detailed logs:
- `[Checkout] Cart retrieved:` - Shows cart contents
- `[Checkout] Creating Stripe session with data:` - Shows data being sent to Stripe
- `[StripeService] Checkout session creation failed:` - Shows Stripe error details

### 2. Common Issues

#### Empty Cart
**Symptom**: `Cart is empty` error
**Solution**: Add items to cart before checkout
1. Go to a product page
2. Select size and color
3. Click "Add to Cart"
4. Go to cart page
5. Click "Proceed to Checkout"

#### Missing Cart Session
**Symptom**: `No cart session found` error
**Solution**: Cart session is stored in localStorage
- Check browser console for `cart_session_id`
- If missing, add an item to cart to create a new session

#### Invalid Cart Items
**Symptom**: Stripe 400 error with `statusCode: 400`
**Possible causes**:
- Missing required fields (productName, price, quantity)
- Invalid price (must be > 0)
- Invalid quantity (must be > 0)
- Missing imageUrl

**Check cart items structure**:
```typescript
{
  id: string
  productId: string
  productName: string
  price: number  // Must be > 0
  quantity: number  // Must be > 0
  size: string
  color: string
  imageUrl?: string
}
```

#### Stripe API Version Mismatch
**Symptom**: Stripe error about API version
**Solution**: Already fixed - using `2024-12-18.acacia`

### 3. Test with Sample Data

To test if Stripe integration works, you can manually add a test item to your cart:

1. Open browser console on any page
2. Run:
```javascript
// Create a cart session
const sessionId = 'test-' + Date.now()
localStorage.setItem('cart_session_id', sessionId)

// Add test item via API
fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: sessionId,
    item: {
      productId: 'test-product',
      productName: 'Test T-Shirt',
      price: 29.99,
      quantity: 1,
      size: 'M',
      color: 'Black',
      imageUrl: 'https://via.placeholder.com/300'
    }
  })
}).then(r => r.json()).then(console.log)
```

3. Go to `/checkout` and try again

### 4. Check Environment Variables

Make sure these are set in `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...  # Your test secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your test publishable key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 5. Verify Stripe Keys

Test your Stripe keys:
```bash
# In terminal
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_KEY: \
  -d "email=test@example.com"
```

If you get an error, your Stripe key might be invalid.

## Next Steps

1. Try checkout again and check the server logs
2. Look for the detailed error message
3. Share the full error output including:
   - `[Checkout] Cart retrieved:` log
   - `[StripeService]` error logs
   - Any Stripe API error details

## Quick Fix: Reset Everything

If nothing works, reset the cart:
1. Open browser console
2. Run: `localStorage.clear()`
3. Refresh the page
4. Add items to cart again
5. Try checkout
