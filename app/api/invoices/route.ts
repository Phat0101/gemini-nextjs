import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * API endpoint to get a user's invoice history from Stripe
 */
export async function GET() {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's subscription details to find their Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { subscription: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has a Stripe customer ID
    const stripeCustomerId = user.subscription?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      // If the user doesn't have a Stripe customer ID, they haven't made any purchases yet
      return NextResponse.json({ invoices: [] });
    }
    
    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100, // Adjust as needed
    });
    
    // Also fetch charges that might not be associated with invoices (for one-time payments)
    const charges = await stripe.charges.list({
      customer: stripeCustomerId,
      limit: 100, // Adjust as needed
    });
    
    // Combine invoices with charges that don't have an invoice ID
    const allInvoices = [...invoices.data];
    
    // For charges without invoices, create a similar structure for consistency
    const chargesWithoutInvoices = charges.data
      .filter(charge => !charge.invoice && charge.paid)
      .map(charge => ({
        id: charge.id,
        number: `CHARGE-${charge.id.slice(-8)}`,
        created: charge.created,
        amount_paid: charge.amount,
        status: charge.paid ? 'paid' : 'unpaid',
        hosted_invoice_url: charge.receipt_url || '',
        invoice_pdf: charge.receipt_url || '',
        currency: charge.currency,
        description: charge.description,
      }));
    
    // Merge the two arrays and sort by date (newest first)
    const mergedInvoices = [...allInvoices, ...chargesWithoutInvoices]
      .sort((a, b) => b.created - a.created);
    
    return NextResponse.json({ invoices: mergedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 