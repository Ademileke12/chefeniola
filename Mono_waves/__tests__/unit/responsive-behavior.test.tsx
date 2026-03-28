import { render, screen } from '@testing-library/react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';

/**
 * Responsive Behavior Tests for Shared Components
 * 
 * These tests verify that components render correctly across different viewport sizes
 * and maintain proper responsive behavior as specified in Requirements 15.1, 15.2, 15.3, 16.1
 */

// Helper to set viewport size
const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Behavior Tests', () => {
  describe('Header Responsive Behavior', () => {
    it('should render mobile navigation on small screens', () => {
      setViewport(375); // Mobile viewport
      const { container } = render(<Header />);
      
      // Mobile navigation should be present
      const mobileNav = container.querySelector('nav.md\\:hidden');
      expect(mobileNav).toBeInTheDocument();
      
      // Desktop navigation should have hidden class on mobile
      const desktopNav = container.querySelector('nav.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });

    it('should render desktop navigation on large screens', () => {
      setViewport(1024); // Desktop viewport
      const { container } = render(<Header />);
      
      // Both navigations should be present (CSS handles visibility)
      const mobileNav = container.querySelector('nav.md\\:hidden');
      const desktopNav = container.querySelector('nav.hidden.md\\:flex');
      
      expect(mobileNav).toBeInTheDocument();
      expect(desktopNav).toBeInTheDocument();
    });

    it('should maintain navigation links across all viewport sizes', () => {
      // Test mobile
      setViewport(375);
      const { rerender } = render(<Header />);
      expect(screen.getAllByText('Shop').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Track Order').length).toBeGreaterThan(0);
      
      // Test tablet
      setViewport(768);
      rerender(<Header />);
      expect(screen.getAllByText('Shop').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Track Order').length).toBeGreaterThan(0);
      
      // Test desktop
      setViewport(1280);
      rerender(<Header />);
      expect(screen.getAllByText('Shop').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Track Order').length).toBeGreaterThan(0);
    });

    it('should maintain cart icon visibility across all viewport sizes', () => {
      setViewport(375); // Mobile
      const { rerender } = render(<Header cartItemCount={3} />);
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      setViewport(768); // Tablet
      rerender(<Header cartItemCount={3} />);
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      setViewport(1280); // Desktop
      rerender(<Header cartItemCount={3} />);
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should have sticky positioning for header', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('sticky', 'top-0');
    });

    it('should apply responsive padding classes', () => {
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.max-w-7xl');
      
      expect(headerContent).toHaveClass('px-6', 'lg:px-8');
    });
  });

  describe('Footer Responsive Behavior', () => {
    it('should render footer grid layout', () => {
      const { container } = render(<Footer />);
      const grid = container.querySelector('.grid');
      
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-4');
    });

    it('should maintain footer content across all viewport sizes', () => {
      setViewport(375); // Mobile
      const { rerender } = render(<Footer />);
      expect(screen.getByText('Mono')).toBeInTheDocument();
      expect(screen.getByText('SHOP')).toBeInTheDocument();
      expect(screen.getByText('SUPPORT')).toBeInTheDocument();
      
      setViewport(768); // Tablet
      rerender(<Footer />);
      expect(screen.getByText('Mono')).toBeInTheDocument();
      expect(screen.getByText('SHOP')).toBeInTheDocument();
      expect(screen.getByText('SUPPORT')).toBeInTheDocument();
      
      setViewport(1280); // Desktop
      rerender(<Footer />);
      expect(screen.getByText('Mono')).toBeInTheDocument();
      expect(screen.getByText('SHOP')).toBeInTheDocument();
      expect(screen.getByText('SUPPORT')).toBeInTheDocument();
    });

    it('should apply responsive padding classes', () => {
      const { container } = render(<Footer />);
      const footerContent = container.querySelector('.max-w-7xl');
      
      expect(footerContent).toHaveClass('px-6', 'lg:px-8');
    });

    it('should maintain all navigation links on mobile', () => {
      setViewport(375);
      render(<Footer />);
      
      expect(screen.getByRole('link', { name: 'All Products' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Track Order' })).toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Consistency', () => {
    it('should maintain proper spacing on mobile', () => {
      setViewport(375);
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.flex.items-center.justify-between');
      
      expect(headerContent).toHaveClass('h-20');
    });

    it('should maintain proper spacing on tablet', () => {
      setViewport(768);
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.flex.items-center.justify-between');
      
      expect(headerContent).toHaveClass('h-20');
    });

    it('should maintain proper spacing on desktop', () => {
      setViewport(1280);
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.flex.items-center.justify-between');
      
      expect(headerContent).toHaveClass('h-20');
    });

    it('should use max-width container for responsive centering', () => {
      const { container } = render(<Header />);
      const maxWidthContainer = container.querySelector('.max-w-7xl');
      
      expect(maxWidthContainer).toBeInTheDocument();
      expect(maxWidthContainer).toHaveClass('mx-auto');
    });
  });

  describe('Interactive Elements Responsive Behavior', () => {
    it('should maintain hover states on all viewport sizes', () => {
      const { container } = render(<Header />);
      const shopLinks = container.querySelectorAll('a[href="/products"]');
      
      shopLinks.forEach(link => {
        expect(link).toHaveClass('hover:text-gray-900');
      });
    });

    it('should maintain cart icon hover state', () => {
      const { container } = render(<Header />);
      const cartLink = screen.getByLabelText('Shopping cart');
      
      expect(cartLink).toHaveClass('hover:opacity-70');
    });

    it('should maintain footer link hover states', () => {
      const { container } = render(<Footer />);
      const links = container.querySelectorAll('a');
      
      // Check that links have hover styles
      const linksWithHover = Array.from(links).filter(link => 
        link.className.includes('hover:text-gray-900')
      );
      
      expect(linksWithHover.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Across Viewports', () => {
    it('should maintain aria-label on cart icon across viewports', () => {
      setViewport(375);
      const { rerender } = render(<Header />);
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
      
      setViewport(1280);
      rerender(<Header />);
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
    });

    it('should maintain semantic HTML structure on mobile', () => {
      setViewport(375);
      const { container } = render(<Header />);
      
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should maintain semantic HTML structure on desktop', () => {
      setViewport(1280);
      const { container } = render(<Header />);
      
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('nav')).toBeInTheDocument();
    });
  });
});
