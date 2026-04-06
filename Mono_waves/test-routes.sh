#!/bin/bash

echo "=== Testing Order Fulfillment Routes ==="
echo ""

echo "1. Checking confirmation page file:"
if [ -f "app/(storefront)/confirmation/page.tsx" ]; then
    echo "   ✓ app/(storefront)/confirmation/page.tsx exists"
else
    echo "   ✗ Confirmation page NOT FOUND"
fi

echo ""
echo "2. Checking tracking page file:"
if [ -f "app/(storefront)/track/page.tsx" ]; then
    echo "   ✓ app/(storefront)/track/page.tsx exists"
else
    echo "   ✗ Tracking page NOT FOUND"
fi

echo ""
echo "3. Checking TrackOrderPage component:"
if [ -f "components/storefront/TrackOrderPage.tsx" ]; then
    echo "   ✓ components/storefront/TrackOrderPage.tsx exists"
else
    echo "   ✗ TrackOrderPage component NOT FOUND"
fi

echo ""
echo "4. Checking checkout API success URL:"
grep -n "successUrl.*confirmation" app/api/checkout/route.ts | head -1

echo ""
echo "=== Route Structure ==="
echo "✓ Confirmation: /confirmation?session_id=..."
echo "✓ Tracking: /track"
echo ""
echo "=== Next Steps ==="
echo "1. Start dev server: npm run dev"
echo "2. Test confirmation: http://localhost:3000/confirmation?session_id=test"
echo "3. Test tracking: http://localhost:3000/track"
echo ""
echo "Note: /confirmation?session_id=test will show 'Order not found' (not 404)"
echo "      This is correct behavior - it means the route works!"
