#!/bin/bash

# Test if the webhook endpoint is accessible and responding

echo "Testing Stripe webhook endpoint..."
echo ""

# Test 1: Check if endpoint exists
echo "1. Testing if endpoint is accessible..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$response" = "400" ]; then
  echo "   ✅ Endpoint is accessible (returned 400 - expected for invalid request)"
elif [ "$response" = "000" ]; then
  echo "   ❌ Cannot connect to localhost:3000"
  echo "   Make sure your dev server is running: npm run dev"
  exit 1
else
  echo "   ⚠️  Unexpected response code: $response"
fi

echo ""
echo "2. Checking server logs..."
echo "   Look at your dev server terminal for webhook logs"
echo ""

# Test 2: Check if we can reach it with a test payload
echo "3. Sending test request (will fail signature check, but should log)..."
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{
    "id": "evt_test",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123"
      }
    }
  }' 2>&1 | head -5

echo ""
echo ""
echo "✅ Test complete. Check your dev server logs for webhook activity."
