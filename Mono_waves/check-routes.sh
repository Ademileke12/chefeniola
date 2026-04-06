#!/bin/bash

echo "=== Checking Order Routes ==="
echo ""

echo "1. Checking if order confirmation page exists:"
if [ -f "app/order/confirmation/page.tsx" ]; then
    echo "   ✓ app/order/confirmation/page.tsx exists"
else
    echo "   ✗ app/order/confirmation/page.tsx NOT FOUND"
fi

echo ""
echo "2. Checking if order tracking page exists:"
if [ -f "app/order/track/page.tsx" ]; then
    echo "   ✓ app/order/track/page.tsx exists"
else
    echo "   ✗ app/order/track/page.tsx NOT FOUND"
fi

echo ""
echo "3. Checking Next.js build cache:"
if [ -d ".next" ]; then
    echo "   ✓ .next directory exists"
    echo "   → Clearing cache..."
    rm -rf .next
    echo "   ✓ Cache cleared"
else
    echo "   ✓ No cache to clear"
fi

echo ""
echo "4. Checking for syntax errors in confirmation page:"
npx tsc --noEmit app/order/confirmation/page.tsx 2>&1 | head -20

echo ""
echo "=== Next Steps ==="
echo "1. Start the dev server: npm run dev"
echo "2. Visit: http://localhost:3000/order/confirmation?session_id=test"
echo "3. Visit: http://localhost:3000/order/track"
echo ""
echo "If you still get 404 errors:"
echo "- Check the terminal for any build errors"
echo "- Try a production build: npm run build"
echo "- Check browser console for errors"
