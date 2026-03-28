We are upgrading our existing product admin system to properly support a Print-on-Demand workflow using the Gelato API for fulfillment and AI-generated mockups. Current state: - We already have an Admin Product Page - It includes: 1. "Browse Catalog" (pulling product types from Gelato API) 2. "Custom Create Product" Goal: Refactor and rebuild this system into a structured product publishing flow where: - Gelato is used ONLY for product specs + fulfillment - Our system handles product display, pricing, and images --- ##



CORE ARCHITECTURE CHANGE Treat Gelato as a fulfillment provider, NOT a storefront. We will: - Store products in OUR database - Generate and store product images using AI - Display products from our DB on frontend --- ##



ADMIN PRODUCT CREATION FLOW (REBUILD THIS UI) Replace the current UI with a structured 4-step product builder: ### STEP 1: Select Base Product (from Gelato API) - Fetch and display: - product type (e.g. hoodie, t-shirt) - available variants (sizes, colors) - Store: - gelatoProductId - variant IDs - print area specs --- ### STEP 2: Add Product Details - Product name - Description - Price (custom, NOT from Gelato) - Category (optional) --- ### STEP 3: Upload Design - Upload design file (PNG, SVG) - Store file URL (used later for Gelato order creation) --- ### STEP 4: Generate Product Images (NEW FEATURE



) Integrate AI image generation using: - Seedream 5.0 Lite via Xroute API Functionality: - Admin clicks "Generate Mockups" - System sends prompt + design context to API - Generate realistic product mockups Example prompt: "realistic ecommerce mockup of a black oversized hoodie with streetwear design, front and back view, studio lighting, clean background" API Requirements: - Use Xroute endpoint - Authenticate with API key - Pass dynamic prompt (include product type + color) Store: - Generated image URLs in product.images[] Allow: - Regenerate images - Upload custom images (fallback option) --- ##



DATABASE STRUCTURE (UPDATE MODEL) Update product schema: { id, name, description, price, gelatoProductId, variants: [ { size, color, variantId } ], designFileUrl, images: [url1, url2], createdAt } --- ##



FRONTEND REQUIREMENTS Update storefront to ONLY use our database. Display: - Product images (AI-generated) - Name - Price - Available colors/sizes (from stored variants) DO NOT fetch product data directly from Gelato on frontend. --- ##



CHECKOUT FLOW (NO CHANGE BUT ENSURE FLOW) - User selects product → variant - Proceeds to checkout using Stripe - On successful payment: - Backend creates order - Sends order to Gelato API: - gelatoProductId - variantId - designFileUrl - shipping details --- ##



BACKEND LOGIC Create service: generateMockups(product) - Builds prompt dynamically: - includes product type - includes color - includes style (ecommerce, realistic) - Calls Xroute API (Seedream 5.0 Lite) - Returns image URLs - Saves to DB --- ##



UX IMPROVEMENTS - Show preview before publishing - Allow editing after creation - Add "Publish / Draft" toggle - Show loading state during AI generation --- ##



EXPECTED RESULT Admin can: - Select product from Gelato - Upload design - Click generate → get product images - Publish product Users can: - View clean product listings - Select variants - Pay via Stripe System handles: - Image generation (AI) - Product storage - Fulfillment via Gelato --- IMPORTANT: - Keep UI clean and minimal - Optimize API calls - Make image generation async (non-blocking)

Ensure generated mockups match modern ecommerce standards similar to Shopify POD stores (clean lighting, centered product, neutral backgrounds, high resolution)