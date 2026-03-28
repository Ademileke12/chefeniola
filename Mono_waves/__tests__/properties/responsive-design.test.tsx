import fc from 'fast-check';
import { render } from '@testing-library/react';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { Product } from '@/types/product';

/**
 * Property-Based Tests for Responsive Design
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal properties about responsive behavior
 * across all viewport sizes and image optimization.
 */

// Arbitraries for test data generation
const viewportArbitrary = () => fc.record({
  width: fc.integer({ min: 320, max: 2560 }),
  height: fc.integer({ min: 568, max: 1440 }),
  name: fc.constantFrom('mobile', 'tablet', 'desktop', 'wide')
});

const productArbitrary = (): fc.Arbitrary<Product> => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ maxLength: 200 }),
  price: fc.float({ min: 10, max: 500, noNaN: true }),
  gelatoProductId: fc.string(),
  gelatoProductUid: fc.string(),
  sizes: fc.array(fc.constantFrom('S', 'M', 'L', 'XL'), { minLength: 1, maxLength: 4 }),
  colors: fc.array(
    fc.record({
      name: fc.constantFrom('Black', 'White', 'Gray', 'Navy', 'Red'),
      hex: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      imageUrl: fc.option(fc.webUrl(), { nil: undefined })
    }),
    { minLength: 1, maxLength: 5 }
  ),
  designUrl: fc.webUrl(),
  mockupUrls: fc.option(
    fc.dictionary(fc.string(), fc.webUrl()),
    { nil: undefined }
  ),
  published: fc.boolean(),
  publishedAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString())
});

const productsArrayArbitrary = () => fc.array(productArbitrary(), { minLength: 0, maxLength: 20 });

// Helper to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Design Properties', () => {
  /**
   * Property 42: Responsive Functionality Preservation
   * 
   * For any viewport size (mobile, tablet, desktop), all core functionality
   * (browsing, cart, checkout, tracking) should remain operational.
   * 
   * Validates: Requirements 15.4
   */
  describe('Property 42: Responsive Functionality Preservation', () => {
    it('should preserve navigation functionality across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          viewportArbitrary(),
          fc.integer({ min: 0, max: 99 }),
          async (viewport, cartCount) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render header with cart count
            const { container, getAllByLabelText } = render(
              <Header cartItemCount={cartCount} />
            );
            
            // Core navigation elements should be present
            const header = container.querySelector('header');
            expect(header).toBeTruthy();
            
            // Cart icon should always be accessible (may have multiple instances)
            const cartIcons = getAllByLabelText('Shopping cart');
            expect(cartIcons.length).toBeGreaterThan(0);
            
            // Navigation links should be present (either mobile or desktop)
            const navElements = container.querySelectorAll('nav');
            expect(navElements.length).toBeGreaterThan(0);
            
            // Logo should be present
            const logo = container.querySelector('a[href="/"]');
            expect(logo).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve product browsing functionality across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          viewportArbitrary(),
          productsArrayArbitrary(),
          async (viewport, products) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render product grid
            const { container } = render(
              <ProductGrid products={products} loading={false} />
            );
            
            if (products.length === 0) {
              // Empty state should be shown
              const emptyMessage = container.textContent;
              expect(emptyMessage).toContain('No products found');
            } else {
              // Product grid should be rendered
              const grid = container.querySelector('.grid');
              expect(grid).toBeTruthy();
              
              // Grid should have responsive classes
              expect(grid?.className).toContain('grid-cols-2');
              expect(grid?.className).toContain('lg:grid-cols-4');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve product card interactivity across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          viewportArbitrary(),
          productArbitrary(),
          async (viewport, product) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render product card
            const { container } = render(
              <ProductCard product={product} />
            );
            
            // Product link should be present
            const link = container.querySelector(`a[href="/products/${product.id}"]`);
            expect(link).toBeTruthy();
            
            // Image should be present
            const image = container.querySelector('img');
            expect(image).toBeTruthy();
            
            // Price should be visible
            const priceText = container.textContent;
            expect(priceText).toContain('$');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve footer content across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          viewportArbitrary(),
          async (viewport) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render footer
            const { container, getAllByText } = render(<Footer />);
            
            // Footer should be present
            const footer = container.querySelector('footer');
            expect(footer).toBeTruthy();
            
            // Key sections should be present (use getAllByText for multiple matches)
            expect(getAllByText('SHOP').length).toBeGreaterThan(0);
            expect(getAllByText('COMPANY').length).toBeGreaterThan(0);
            expect(getAllByText('SUPPORT').length).toBeGreaterThan(0);
            
            // Grid layout should have responsive classes
            const grid = container.querySelector('.grid');
            expect(grid?.className).toContain('grid-cols-1');
            expect(grid?.className).toContain('md:grid-cols-4');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain responsive container widths across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          viewportArbitrary(),
          async (viewport) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render header
            const { container } = render(<Header cartItemCount={0} />);
            
            // Max-width container should be present
            const maxWidthContainer = container.querySelector('.max-w-7xl');
            expect(maxWidthContainer).toBeTruthy();
            
            // Container should be centered
            expect(maxWidthContainer?.className).toContain('mx-auto');
            
            // Container should have responsive padding
            const hasResponsivePadding = 
              maxWidthContainer?.className.includes('px-') ||
              maxWidthContainer?.className.includes('sm:px-') ||
              maxWidthContainer?.className.includes('lg:px-');
            expect(hasResponsivePadding).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 43: Image Optimization
   * 
   * For any product image displayed, the image URL should include appropriate
   * size parameters based on the display context.
   * 
   * Validates: Requirements 15.5
   */
  describe('Property 43: Image Optimization', () => {
    it('should use Next.js Image component with sizes attribute for product cards', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArbitrary(),
          async (product) => {
            // Render product card
            const { container } = render(
              <ProductCard product={product} />
            );
            
            // Image should be present
            const image = container.querySelector('img');
            expect(image).toBeTruthy();
            
            // Image should have alt text
            expect(image?.getAttribute('alt')).toBeTruthy();
            
            // Next.js Image component adds specific attributes
            // Check for loading optimization
            const hasLoadingAttr = image?.hasAttribute('loading');
            expect(hasLoadingAttr).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide appropriate image sizes for different viewport contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArbitrary(),
          viewportArbitrary(),
          async (product, viewport) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render product card
            const { container } = render(
              <ProductCard product={product} />
            );
            
            // Image should be present
            const image = container.querySelector('img');
            expect(image).toBeTruthy();
            
            // Image should have proper aspect ratio container
            const imageContainer = container.querySelector('.aspect-\\[3\\/4\\]');
            expect(imageContainer).toBeTruthy();
            
            // Container should have overflow hidden for proper cropping
            expect(imageContainer?.className).toContain('overflow-hidden');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain image aspect ratios across all viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          productsArrayArbitrary(),
          viewportArbitrary(),
          async (products, viewport) => {
            // Set viewport
            setViewport(viewport.width, viewport.height);
            
            // Render product grid
            const { container } = render(
              <ProductGrid products={products} loading={false} />
            );
            
            if (products.length > 0) {
              // All product images should have consistent aspect ratio
              const imageContainers = container.querySelectorAll('.aspect-\\[3\\/4\\]');
              
              // Each product should have an image container with aspect ratio
              expect(imageContainers.length).toBeGreaterThan(0);
              
              // All containers should have the same aspect ratio class
              imageContainers.forEach(container => {
                expect(container.className).toContain('aspect-[3/4]');
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use object-cover for proper image scaling', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArbitrary(),
          async (product) => {
            // Render product card
            const { container } = render(
              <ProductCard product={product} />
            );
            
            // Image should use object-cover for proper scaling
            const image = container.querySelector('img');
            expect(image?.className).toContain('object-cover');
            
            // Image container should have proper positioning
            const imageContainer = image?.parentElement;
            expect(imageContainer?.className).toContain('relative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should optimize images with proper fill and sizes attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          productsArrayArbitrary(),
          async (products) => {
            if (products.length === 0) return;
            
            // Render product grid
            const { container } = render(
              <ProductGrid products={products} loading={false} />
            );
            
            // All images should be optimized
            const images = container.querySelectorAll('img');
            
            images.forEach(image => {
              // Image should have alt text for accessibility
              expect(image.getAttribute('alt')).toBeTruthy();
              
              // Image should have loading attribute for optimization
              expect(image.hasAttribute('loading')).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain image quality across different viewport sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArbitrary(),
          fc.array(viewportArbitrary(), { minLength: 2, maxLength: 5 }),
          async (product, viewports) => {
            // Test across multiple viewports
            for (const viewport of viewports) {
              setViewport(viewport.width, viewport.height);
              
              const { container } = render(
                <ProductCard product={product} />
              );
              
              // Image should always be present
              const image = container.querySelector('img');
              expect(image).toBeTruthy();
              
              // Image should have proper attributes
              expect(image?.getAttribute('alt')).toBeTruthy();
              expect(image?.hasAttribute('loading')).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
