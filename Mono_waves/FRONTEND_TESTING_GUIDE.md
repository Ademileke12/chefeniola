# Frontend Testing Guide: Order Fulfillment Automation

This guide walks you through testing the order fulfillment automation feature in your browser.

## Prerequisites

Before testing, ensure:

1. **Database migration is complete**:
   ```bash
   npm run migrate
   ```

2. **Environment variables are configured** in `.env.local`:
   ```bash
   # Stripe (use test mode keys)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Resend (for emails)
   RESEND_API_KEY=re_...
   SENDER_EMAIL=orders@monowaves.com
   ADMIN_EMAIL=admin@monowaves.com
   
   # Gelato
   GELATO_API_KEY=...
   
   # Database
   DATABASE_URL=...
   ```

3. **Stripe Tax is enabled** in your Stripe Dashboard (test mode)

4. **Development server is running**:
   ```bash
   npm run dev
   ```

## Test Scenarios

### Scenario 1: Complete Order Flow (Happy Path)

This tests the entire flow from cart to order confirmation.

#### Steps:

1. **Browse Products**
   - Navigate to `http://localhost:3000/products`
   - You should see a list of available products

2. **Add Product to Cart**
   - Click on any product
   - Select size and color
   - Click "Add to Cart"
   - Verify cart icon shows item count

3. **View Cart**
   - Click cart icon or navigate to `/cart`
   - Verify:
     - Product details are correct
     - Quantity can be adjusted
     - Subtotal is calculated correctly
     - Shipping cost is displayed (should query Gelato API)
     - Tax is calculated (via Stripe Tax)
     - Total = Subtotal + Shipping + Tax

4. **Proceed to Checkout**
   - Click "Proceed to Checkout"
   - You'll be redirected to Stripe Checkout
   - Verify:
     - All items are listed
     - Shipping cost is included
     - Tax is calculated based on address
     - Total matches cart total

5. **Complete Payment (Test Mode)**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
   - Fill in shipping address (use a US address for tax calculation)
   - Click "Pay"

6. **Order Confirmation Page**
   - After payment, you should be redirected to `/order/confirmation?session_id=...`
   - Verify the page displays:
     - ✅ Order number (format: MW-XXXXXXXX)
     - ✅ All items ordered with correct details
     - ✅ Shipping address
     - ✅ Order totals (subtotal, shipping, tax, total)
     - ✅ Estimated delivery date (7-10 business days from today)
     - ✅ "Track Order" button
   - If tracking is available, it should display tracking number

7. **Check Email (if Resend is configured)**
   - Check the email address used in checkout
   - You should receive an order confirmation email with:
     - Order number
     - Items ordered
     - Shipping address
     - Total paid
     - Estimated delivery date

8. **Check Admin Dashboard**
   - Navigate to `/admin/orders`
   - Find your order
   - Verify:
     - Order status is "submitted_to_gelato" or "payment_confirmed"
     - Tax amount is stored correctly
     - Gelato order ID is present (if submission succeeded)

---

### Scenario 2: Order Tracking

This tests the order tracking functionality.

#### Steps:

1. **Navigate to Tracking Page**
   - Go to `http://localhost:3000/order/track`
   - Or click "Track Order" from confirmation page

2. **Test Form Validation**
   - Try submitting empty form → Should show validation errors
   - Try invalid email format → Should show validation error
   - Try valid email but wrong order number → Should show "Order not found"

3. **Track Valid Order**
   - Enter the email used for checkout
   - Enter the order number from confirmation page
   - Click "Track Order"
   - Verify the page displays:
     - ✅ Order number
     - ✅ Order status with user-friendly message
     - ✅ Order date
     - ✅ Estimated delivery date
     - ✅ All items ordered
     - ✅ Order total
     - ✅ Tracking information (if available):
       - Tracking number
       - Carrier name
       - Link to carrier tracking page

4. **Test Carrier Tracking Links**
   - If tracking info is available, click "Track on [Carrier] Website"
   - Should open carrier's tracking page in new tab
   - Verify URL format:
     - USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=...`
     - UPS: `https://www.ups.com/track?tracknum=...`
     - FedEx: `https://www.fedex.com/fedextrack/?trknbr=...`
     - DHL: `https://www.dhl.com/en/express/tracking.html?AWB=...`

5. **Test "Track Another Order"**
   - Click "Track Another Order" button
   - Form should clear and be ready for new search

---

### Scenario 3: Tax Calculation

This tests Stripe Tax integration.

#### Steps:

1. **Add Product to Cart**
   - Add any product to cart
   - Go to cart page

2. **Test Different Addresses**
   - Proceed to checkout
   - Try different US states in shipping address
   - Verify tax amount changes based on state
   - Common test addresses:
     - California (high tax): Use ZIP 90210
     - Oregon (no sales tax): Use ZIP 97201
     - New York: Use ZIP 10001

3. **Verify Tax Display**
   - In cart summary, tax should be shown as separate line item
   - In Stripe Checkout, tax should be itemized
   - On confirmation page, tax should be displayed
   - In order tracking, tax should be included in total

---

### Scenario 4: Shipping Cost Calculation

This tests dynamic shipping cost from Gelato API.

#### Steps:

1. **Add Product to Cart**
   - Add any product to cart
   - Go to cart page

2. **Check Shipping Cost**
   - Shipping cost should be displayed in cart summary
   - It should be fetched from Gelato API based on:
     - Product type
     - Quantity
     - Destination (will be determined at checkout)

3. **Test Fallback Behavior**
   - If Gelato API is unavailable, shipping should default to $10.00
   - Check browser console for any API errors

4. **Verify Shipping in Checkout**
   - Proceed to Stripe Checkout
   - Shipping cost should match cart display
   - Should be included in total

---

### Scenario 5: Error Handling

This tests error scenarios and edge cases.

#### Steps:

1. **Test Invalid Session ID**
   - Navigate to `/order/confirmation?session_id=invalid`
   - Should show error message: "Order not found"

2. **Test Missing Session ID**
   - Navigate to `/order/confirmation` (no session_id)
   - Should show error message or redirect

3. **Test Invalid Tracking Lookup**
   - Go to `/order/track`
   - Enter wrong email or order number
   - Should show "Order not found" message
   - Should NOT reveal which field is wrong (security)

4. **Test Network Errors**
   - Open browser DevTools → Network tab
   - Throttle network to "Slow 3G"
   - Try tracking an order
   - Should show loading state
   - Should handle timeout gracefully

---

### Scenario 6: Webhook Testing (Advanced)

This tests webhook handling using Stripe CLI.

#### Prerequisites:
- Install Stripe CLI: https://stripe.com/docs/stripe-cli
- Login: `stripe login`

#### Steps:

1. **Forward Webhooks to Local Server**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   - Copy the webhook signing secret (starts with `whsec_`)
   - Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
   - Restart dev server

2. **Trigger Test Webhook**
   ```bash
   stripe trigger checkout.session.completed
   ```

3. **Verify Webhook Processing**
   - Check terminal logs for webhook processing
   - Check database for new order
   - Check if confirmation email was sent
   - Check if order was submitted to Gelato

4. **Test Gelato Webhook** (if you have Gelato webhook configured)
   - Use a tool like ngrok to expose local server
   - Configure Gelato webhook URL in Gelato dashboard
   - When order ships, webhook should:
     - Update order status to "shipped"
     - Store tracking information
     - Send shipping notification email

---

## Visual Checklist

### Order Confirmation Page Should Show:
- [ ] Order number prominently displayed
- [ ] Customer email
- [ ] All items with images, names, sizes, colors, quantities
- [ ] Shipping address formatted correctly
- [ ] Subtotal, shipping cost, tax, and total
- [ ] Estimated delivery date (future date, 7-10 business days)
- [ ] "Track Order" button
- [ ] "Continue Shopping" link
- [ ] Support contact information

### Order Tracking Page Should Show:
- [ ] Form with email and order number inputs
- [ ] Form validation (required fields, email format)
- [ ] Loading state during API call
- [ ] Order status with icon and user-friendly message
- [ ] Order date and estimated delivery
- [ ] All items ordered
- [ ] Order total
- [ ] Tracking information section (if available)
- [ ] Carrier tracking link (opens in new tab)
- [ ] "Track Another Order" button
- [ ] "Continue Shopping" link

### Cart Page Should Show:
- [ ] All cart items with correct details
- [ ] Quantity adjustment controls
- [ ] Remove item button
- [ ] Subtotal calculation
- [ ] Shipping cost (from Gelato API or $10 fallback)
- [ ] Tax calculation (from Stripe Tax)
- [ ] Total = Subtotal + Shipping + Tax
- [ ] "Proceed to Checkout" button
- [ ] Empty cart state (if no items)

---

## Common Issues and Solutions

### Issue: Tax not calculating
**Solution**: 
- Ensure Stripe Tax is enabled in Stripe Dashboard (test mode)
- Check that shipping address includes valid US state
- Verify `STRIPE_SECRET_KEY` is set correctly

### Issue: Shipping cost shows $10 (fallback)
**Solution**:
- Check `GELATO_API_KEY` is configured
- Check browser console for API errors
- Verify Gelato API is accessible
- Check network tab for failed requests

### Issue: Confirmation email not received
**Solution**:
- Check `RESEND_API_KEY` is configured
- Verify sender email is verified in Resend dashboard
- Check spam folder
- Check server logs for email sending errors
- Test email service: `npm test -- __tests__/unit/email-service.test.ts`

### Issue: Order not found on tracking page
**Solution**:
- Verify email and order number are correct (case-sensitive)
- Check database to confirm order exists
- Ensure order has `stripe_session_id` stored
- Check API logs: `/api/orders/track`

### Issue: Confirmation page shows "Order not found"
**Solution**:
- Check URL has valid `session_id` parameter
- Verify order was created in database
- Check Stripe webhook was processed successfully
- Look for errors in webhook logs

---

## Testing with Stripe Test Cards

Use these test cards for different scenarios:

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Card declined |
| Insufficient funds | 4000 0000 0000 9995 | Insufficient funds |
| Expired card | 4000 0000 0000 0069 | Expired card |
| Processing error | 4000 0000 0000 0119 | Processing error |

For all cards:
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## Monitoring and Logs

### Check Server Logs
```bash
# Watch server logs in terminal where dev server is running
# Look for:
# - "Order created: MW-XXXXXXXX"
# - "Order submitted to Gelato: MW-XXXXXXXX"
# - "Confirmation email sent to: customer@example.com"
# - Any error messages
```

### Check Database
```bash
# Connect to Supabase and check orders table
# Verify:
# - Order record exists
# - tax column has correct value
# - stripe_session_id is stored
# - gelato_order_id is present (if submitted)
# - status is correct
```

### Check Browser Console
```bash
# Open DevTools → Console
# Look for:
# - API request/response logs
# - Any JavaScript errors
# - Network errors
```

---

## Automated Testing

Run the test suites to verify functionality:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- __tests__/unit/pages/order-confirmation.test.tsx
npm test -- __tests__/unit/pages/order-tracking.test.tsx
npm test -- __tests__/properties/order-fulfillment.test.ts
npm test -- __tests__/properties/tax-and-shipping.test.ts
npm test -- __tests__/properties/order-tracking.test.ts

# Run integration tests
npm test -- __tests__/integration/stripe-webhook.test.ts
npm test -- __tests__/integration/order-api.test.ts
```

---

## Success Criteria

Your implementation is working correctly if:

✅ Customers can complete checkout with tax and shipping calculated
✅ Order confirmation page displays all required information
✅ Confirmation email is sent to customer
✅ Order is submitted to Gelato automatically
✅ Customers can track orders using email and order number
✅ Tracking page displays order status and tracking info
✅ Carrier tracking links work correctly
✅ Tax is calculated based on shipping address
✅ Shipping cost is fetched from Gelato API (or falls back to $10)
✅ Admin receives notifications on errors
✅ All automated tests pass

---

## Next Steps

After successful testing:

1. **Deploy to staging environment**
2. **Test with real Stripe account (still in test mode)**
3. **Verify email delivery in production**
4. **Test Gelato integration with real orders**
5. **Monitor webhook processing**
6. **Set up error alerting**
7. **Enable Stripe Tax in production**
8. **Switch to production API keys**

---

## Support

If you encounter issues:

1. Check server logs for errors
2. Check browser console for client-side errors
3. Review test results for failing tests
4. Check webhook logs in Stripe Dashboard
5. Verify all environment variables are set
6. Ensure database migration completed successfully

For questions, contact: support@monowaves.com
