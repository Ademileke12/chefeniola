#!/bin/bash

echo "=== EXTENSIVE ROUTE DEBUGGING ==="
echo ""

echo "1. Checking file system structure..."
echo "   Confirmation page:"
ls -la "app/(storefront)/confirmation/page.tsx" 2>&1
echo ""
echo "   Track page:"
ls -la "app/(storefront)/track/page.tsx" 2>&1
echo ""

echo "2. Checking file contents (first 5 lines)..."
echo "   Confirmation page:"
head -5 "app/(storefront)/confirmation/page.tsx"
echo ""

echo "3. Checking for hidden characters or BOM..."
file "app/(storefront)/confirmation/page.tsx"
echo ""

echo "4. Checking layout file..."
if [ -f "app/(storefront)/layout.tsx" ]; then
    echo "   ✓ Layout exists"
    echo "   First 10 lines:"
    head -10 "app/(storefront)/layout.tsx"
else
    echo "   ✗ Layout NOT FOUND"
fi
echo ""

echo "5. Checking other working routes in same folder..."
echo "   Cart page (should work):"
ls -la "app/(storefront)/cart/page.tsx" 2>&1
echo ""
echo "   Track page:"
ls -la "app/(storefront)/track/page.tsx" 2>&1
echo ""

echo "6. Comparing file permissions..."
echo "   Cart (working):"
stat -c "%a %n" "app/(storefront)/cart/page.tsx" 2>&1 || stat -f "%Lp %N" "app/(storefront)/cart/page.tsx" 2>&1
echo "   Confirmation (not working):"
stat -c "%a %n" "app/(storefront)/confirmation/page.tsx" 2>&1 || stat -f "%Lp %N" "app/(storefront)/confirmation/page.tsx" 2>&1
echo ""

echo "7. Checking Next.js config..."
if [ -f "next.config.js" ]; then
    echo "   ✓ next.config.js exists"
    cat next.config.js
else
    echo "   ✗ next.config.js NOT FOUND"
fi
echo ""

echo "8. Checking for .gitignore or .nextignore issues..."
if grep -q "confirmation" .gitignore 2>/dev/null; then
    echo "   ⚠ WARNING: 'confirmation' found in .gitignore"
else
    echo "   ✓ No gitignore issues"
fi
echo ""

echo "9. Checking package.json for Next.js version..."
grep -A 2 '"next"' package.json
echo ""

echo "10. Testing if other routes in (storefront) work..."
echo "    Available routes:"
find app/\(storefront\) -name "page.tsx" -type f | sed 's|app/(storefront)/||' | sed 's|/page.tsx||'
echo ""

echo "=== DIAGNOSIS ==="
echo ""
echo "If the file exists and has correct permissions, the issue is likely:"
echo "1. Next.js dev server needs restart"
echo "2. Port conflict or server not running"
echo "3. Layout file issue"
echo "4. Next.js version compatibility"
echo ""
echo "Try these fixes in order:"
echo "1. Kill all node processes: pkill -9 node"
echo "2. Clear cache: rm -rf .next"
echo "3. Reinstall: rm -rf node_modules && npm install"
echo "4. Start fresh: npm run dev"
