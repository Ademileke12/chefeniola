/**
 * Debug script to test product creation
 */

const testProductData = {
  name: "Test Product",
  description: "Test description",
  price: 29.99,
  gelatoProductUid: "apparel_product_gca_t-shirt_1",
  gelatoProductId: "apparel_product_gca_t-shirt_1",
  variants: [
    {
      size: "M",
      color: "White",
      colorCode: "#FFFFFF",
      variantId: "test-variant-id"
    }
  ],
  designFileUrl: "https://example.com/design.png",
  images: ["https://example.com/design.png"]
};

console.log("Testing product creation with data:");
console.log(JSON.stringify(testProductData, null, 2));

// Test the API endpoint
fetch('http://localhost:3000/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'admin-session=your-session-here' // Replace with actual session
  },
  body: JSON.stringify(testProductData)
})
  .then(res => res.json())
  .then(data => {
    console.log("\n✅ Response:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("\n❌ Error:");
    console.error(err);
  });
