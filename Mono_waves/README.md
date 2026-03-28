# Mono Waves E-Commerce Platform

A production-ready print-on-demand clothing e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- Customer-facing storefront with product browsing and guest checkout
- Admin dashboard for product and order management
- Integration with Gelato API for print-on-demand fulfillment
- Stripe payment processing
- Supabase for data persistence and file storage
- Real-time order tracking
- Responsive design for mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Payment**: Stripe
- **Fulfillment**: Gelato API
- **Testing**: Jest, React Testing Library, fast-check (Property-Based Testing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account
- Gelato API account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your environment variables:

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

See `.env.example` for required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
- `GELATO_API_KEY`: Your Gelato API key
- `GELATO_WEBHOOK_SECRET`: Your Gelato webhook secret

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (storefront)/      # Customer-facing pages
│   └── admin/             # Admin dashboard pages
├── components/            # React components
│   ├── storefront/        # Storefront components
│   ├── admin/             # Admin components
│   └── ui/                # Shared UI components
├── lib/                   # Library code
│   ├── services/          # Service layer
│   ├── supabase/          # Supabase clients
│   └── utils/             # Utility functions
├── types/                 # TypeScript type definitions
└── __tests__/             # Test files
```

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Deployment

This project is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

## License

MIT
