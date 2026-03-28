import { render, screen } from '@testing-library/react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import Layout from '@/components/storefront/Layout';

describe('Storefront Layout Components', () => {
  describe('Header', () => {
    it('should render logo with link to homepage', () => {
      render(<Header />);
      
      const mono = screen.getByText('Mono');
      const verse = screen.getByText('VERSE');
      expect(mono).toBeInTheDocument();
      expect(verse).toBeInTheDocument();
      expect(mono.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render navigation links', () => {
      render(<Header />);
      
      const shopLinks = screen.getAllByText('Shop');
      const trackOrderLinks = screen.getAllByText(/Track Order/i);
      
      expect(shopLinks.length).toBeGreaterThan(0);
      expect(trackOrderLinks.length).toBeGreaterThan(0);
    });

    it('should render search icon', () => {
      render(<Header />);
      
      const searchButton = screen.getByLabelText('Search');
      expect(searchButton).toBeInTheDocument();
    });

    it('should render user icon with link to account page', () => {
      render(<Header />);
      
      const accountLink = screen.getByLabelText('Account');
      expect(accountLink).toHaveAttribute('href', '/account');
    });

    it('should render cart icon with link to cart page', () => {
      render(<Header />);
      
      const cartLink = screen.getByLabelText('Shopping cart');
      expect(cartLink).toHaveAttribute('href', '/cart');
    });

    it('should display cart item count when items exist', () => {
      render(<Header cartItemCount={3} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display 9+ when cart has more than 9 items', () => {
      render(<Header cartItemCount={15} />);
      
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should not display cart count when cart is empty', () => {
      render(<Header cartItemCount={0} />);
      
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should have proper spacing and styling', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      
      expect(header).toHaveClass('bg-white', 'border-b', 'sticky', 'top-0');
    });
  });

  describe('Footer', () => {
    it('should render brand name', () => {
      render(<Footer />);
      
      const mono = screen.getByText('Mono');
      const verse = screen.getByText('VERSE');
      expect(mono).toBeInTheDocument();
      expect(verse).toBeInTheDocument();
    });

    it('should render SHOP section', () => {
      render(<Footer />);
      
      expect(screen.getByText('SHOP')).toBeInTheDocument();
    });

    it('should render COMPANY section', () => {
      render(<Footer />);
      
      expect(screen.getByText('COMPANY')).toBeInTheDocument();
    });

    it('should render SUPPORT section', () => {
      render(<Footer />);
      
      expect(screen.getByText('SUPPORT')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      render(<Footer />);
      
      const allProductsLink = screen.getByRole('link', { name: 'All Products' });
      const trackOrderLink = screen.getByRole('link', { name: 'Track Order' });
      const contactLink = screen.getByRole('link', { name: 'Contact Us' });
      
      expect(allProductsLink).toHaveAttribute('href', '/products');
      expect(trackOrderLink).toHaveAttribute('href', '/track-order');
      expect(contactLink).toHaveAttribute('href', '/contact');
    });

    it('should render copyright with current year', () => {
      render(<Footer />);
      
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear} MONO VERSE`))).toBeInTheDocument();
    });

    it('should have beige background', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      
      expect(footer).toHaveClass('bg-[#F5F5DC]');
    });

    it('should have 4-column grid layout', () => {
      const { container } = render(<Footer />);
      const grid = container.querySelector('.grid');
      
      expect(grid).toHaveClass('md:grid-cols-4');
    });
  });

  describe('Layout', () => {
    it('should render Header, children, and Footer', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Check for brand elements
      expect(screen.getAllByText('Mono').length).toBeGreaterThan(0); // Header and Footer
      expect(screen.getByText('Test Content')).toBeInTheDocument(); // Children
      expect(screen.getByText('SHOP')).toBeInTheDocument(); // Footer
    });

    it('should pass cartItemCount to Header', () => {
      render(
        <Layout cartItemCount={5}>
          <div>Test Content</div>
        </Layout>
      );
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should have proper layout structure', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveTextContent('Test Content');
    });

    it('should have off-white background', () => {
      const { container } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('bg-[#FAFAF8]');
    });
  });
});
