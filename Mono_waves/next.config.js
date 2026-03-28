/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'gelato.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '**.volces.com',
      },
      {
        protocol: 'https',
        hostname: 'ark-content-generation-v2-ap-southeast-1.tos-ap-southeast-1.volces.com',
      },
    ],
  },
}

module.exports = nextConfig
