import Link from 'next/link';
import SupportForm from './SupportForm';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#F5F5DC] border-t border-gray-200 mt-auto overflow-hidden">
      {/* Visual background elements */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Support Form Section - Takes 5 cols on large screens */}
          <div className="lg:col-span-5">
            <SupportForm />
          </div>

          {/* Links Section - Takes 7 cols on large screens */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* Brand Section */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <span className="text-lg font-light tracking-[0.15em] text-gray-900">
                  <span className="font-extralight italic font-playfair">
                    Mono
                  </span>
                  <span className="ml-2 font-thin tracking-[0.3em] font-inter">
                    VERSE
                  </span>
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
                Redefining modern luxury through archival silhouettes and sustainable textile innovation.
              </p>
            </div>

            {/* Shop Links */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                SHOP
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/products"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    All Products
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                COMPANY
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                SUPPORT
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/track"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-300 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">
            © {currentYear} MONO VERSE. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
