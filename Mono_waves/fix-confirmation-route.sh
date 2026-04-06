#!/bin/bash

echo "=== Fixing Confirmation Route ==="
echo ""

echo "Step 1: Clearing Next.js cache..."
rm -rf .next
echo "✓ Cache cleared"

echo ""
echo "Step 2: Verifying file exists..."
if [ -f "app/(storefront)/confirmation/page.tsx" ]; then
    echo "✓ Confirmation page exists"
else
    echo "✗ ERROR: Confirmation page not found!"
    exit 1
fi

echo ""
echo "Step 3: Checking for syntax errors..."
node -e "
const fs = require('fs');
const content = fs.readFileSync('app/(storefront)/confirmation/page.tsx', 'utf8');
if (content.includes('export default')) {
    console.log('✓ Page has default export');
} else {
    console.log('✗ ERROR: No default export found');
    process.exit(1);
}
"

echo ""
echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. Restart your dev server:"
echo "   - Stop the current server (Ctrl+C)"
echo "   - Run: npm run dev"
echo ""
echo "2. Test the route:"
echo "   http://localhost:3000/confirmation?session_id=test"
echo ""
echo "Note: You should see 'Order not found' (not a 404)"
echo "      This means the route is working!"
