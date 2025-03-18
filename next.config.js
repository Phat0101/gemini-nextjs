/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/worklets/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  // Expose Stripe URLs to the client side
  env: {
    NEXT_PUBLIC_STRIPE_PLUS_PACKAGE_URL: process.env.STRIPE_PLUS_PACKAGE_URL,
    NEXT_PUBLIC_STRIPE_PREMIUM_PACKAGE_URL: process.env.STRIPE_PREMIUM_PACKAGE_URL,
  },
};

module.exports = nextConfig; 