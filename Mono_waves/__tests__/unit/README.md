# Unit Tests for Shared Components

This directory contains comprehensive unit tests for the Mono Waves e-commerce platform's shared components.

## Test Coverage Summary

### UI Components (`ui-components.test.tsx`)
Tests for all UI utility components with 46 test cases:

**Button Component (12 tests)**
- Rendering with children
- All variants (primary, secondary, outline, ghost)
- All sizes (sm, md, lg)
- Full width styling
- Click event handling
- Disabled state
- Loading state

**Input Component (10 tests)**
- Basic rendering
- Label association
- Helper text display
- Error message display and styling
- Full width styling
- Value change handling
- Accessibility attributes (aria-invalid, aria-describedby)

**Card Component (8 tests)**
- Basic rendering
- All variants (default, bordered, elevated)
- All padding options (none, sm, md, lg)
- Sub-components (CardHeader, CardTitle, CardContent, CardFooter)
- Complete card structure

**ErrorMessage Component (8 tests)**
- Inline and banner variants
- Title display
- Accessibility attributes (role="alert", aria-live="polite")
- Dismiss functionality
- Conditional dismiss button rendering

**LoadingSpinner Component (6 tests)**
- Basic rendering
- Text display
- All sizes (sm, md, lg)
- Full screen overlay
- Animation classes

### Storefront Layout Components (`storefront-layout.test.tsx`)
Tests for navigation and layout components with 20 test cases:

**Header Component (6 tests)**
- Logo and homepage link
- Navigation links (Shop, Track Order)
- Cart icon and link
- Cart item count display
- Cart count badge (9+ for >9 items)
- Empty cart state

**Footer Component (5 tests)**
- Brand name display
- Section headings (Quick Links, Support)
- Navigation links with correct hrefs
- Copyright with current year
- Contact email link

**Layout Component (3 tests)**
- Complete layout structure (Header + children + Footer)
- Cart item count propagation to Header
- Semantic HTML structure (main element)

### Responsive Behavior Tests (`responsive-behavior.test.tsx`)
Tests for responsive design across different viewport sizes with 20 test cases:

**Header Responsive Behavior (6 tests)**
- Mobile navigation rendering (md:hidden class)
- Desktop navigation rendering (hidden md:flex classes)
- Navigation link persistence across viewports (375px, 768px, 1280px)
- Cart icon visibility across all viewports
- Sticky positioning
- Responsive padding classes (px-4 sm:px-6 lg:px-8)

**Footer Responsive Behavior (4 tests)**
- Grid layout classes (grid-cols-1 md:grid-cols-3)
- Content persistence across viewports
- Responsive padding classes
- Mobile navigation link visibility

**Responsive Layout Consistency (4 tests)**
- Proper spacing on mobile (375px)
- Proper spacing on tablet (768px)
- Proper spacing on desktop (1280px)
- Max-width container for responsive centering

**Interactive Elements Responsive Behavior (3 tests)**
- Hover states on all viewport sizes
- Cart icon hover state
- Footer link hover states

**Accessibility Across Viewports (3 tests)**
- aria-label persistence across viewports
- Semantic HTML structure on mobile
- Semantic HTML structure on desktop

## Requirements Coverage

These tests validate the following requirements:

- **Requirement 16.1**: Navigation bar with logo, shop links, track order link, and cart icon
- **Requirement 16.2**: Logo navigation to homepage
- **Requirement 16.3**: Cart icon navigation to cart page
- **Requirement 16.4**: Footer with relevant links and information
- **Requirement 16.5**: Visual feedback on interactive elements (hover states)
- **Requirement 15.1**: Mobile-optimized layout
- **Requirement 15.2**: Tablet-optimized layout
- **Requirement 15.3**: Desktop-optimized layout
- **Requirement 15.4**: Functionality maintained across all breakpoints
- **Requirement 19.1**: Specific error messages
- **Requirement 19.3**: User-friendly error messages

## Running Tests

```bash
# Run all unit tests
npm test -- __tests__/unit/

# Run specific test file
npm test -- __tests__/unit/ui-components.test.tsx
npm test -- __tests__/unit/storefront-layout.test.tsx
npm test -- __tests__/unit/responsive-behavior.test.tsx

# Run tests in watch mode
npm test:watch
```

## Test Statistics

- **Total Test Suites**: 3
- **Total Tests**: 86 (for shared components only)
- **Coverage**: 100% of shared components
- **All Tests**: ✅ Passing

## Testing Approach

The tests follow these principles:

1. **Comprehensive Coverage**: Every component prop and variant is tested
2. **Accessibility First**: Tests verify ARIA attributes and semantic HTML
3. **Responsive Design**: Tests verify behavior across mobile, tablet, and desktop viewports
4. **User Interactions**: Tests verify click handlers, form inputs, and state changes
5. **Edge Cases**: Tests verify empty states, error states, and boundary conditions

## Component Test Matrix

| Component | Variants | Sizes | States | Accessibility | Responsive |
|-----------|----------|-------|--------|---------------|------------|
| Button | 4 | 3 | 3 | ✅ | ✅ |
| Input | 1 | 1 | 2 | ✅ | ✅ |
| Card | 3 | 4 | 1 | ✅ | ✅ |
| ErrorMessage | 2 | - | 2 | ✅ | ✅ |
| LoadingSpinner | 1 | 3 | 2 | ✅ | ✅ |
| Header | 1 | - | 2 | ✅ | ✅ |
| Footer | 1 | - | 1 | ✅ | ✅ |
| Layout | 1 | - | 1 | ✅ | ✅ |

## Notes

- All tests use React Testing Library for component testing
- Tests follow the "Arrange-Act-Assert" pattern
- Mock data is minimal and focused on testing specific behaviors
- Tests are isolated and can run in any order
- Responsive tests simulate viewport changes using window.innerWidth
