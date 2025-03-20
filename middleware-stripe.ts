import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// This middleware specifically handles Stripe webhook requests
export function middleware(request: NextRequest) {
  console.log('Stripe webhook middleware running for path:', request.nextUrl.pathname);
  
  // For OPTIONS requests, return 200 with CORS headers
  if (request.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for Stripe webhook');
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // For all other methods, continue but add CORS headers
  console.log('Adding CORS headers to Stripe webhook request');
  return NextResponse.next({
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}

// Configure the middleware to run ONLY on Stripe webhook paths
export const config = {
  matcher: ['/api/webhooks/stripe', '/api/webhooks/stripe/:path*'],
}; 