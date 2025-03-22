import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * API endpoint to get a user's invoice history from Stripe
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user from database with all Stripe customer IDs
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        subscription: true,
        stripeCustomers: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all customer IDs for this user
    const customerIds = user.stripeCustomers.map(customer => customer.stripeCustomerId);
    
    // Also include the legacy customer ID if it exists and isn't already in the list
    if (user.subscription?.stripeCustomerId && !customerIds.includes(user.subscription.stripeCustomerId)) {
      customerIds.push(user.subscription.stripeCustomerId);
    }
    
    console.log(`Found ${customerIds.length} Stripe customer IDs for user ${userId}`);

    if (customerIds.length === 0) {
      console.log(`No Stripe customer IDs found for user ${userId}`);
      return NextResponse.json({ invoices: [] });
    }

    // Initialize arrays to collect all invoices and charges
    let allInvoices: Stripe.Invoice[] = [];
    let allCharges: Stripe.Charge[] = [];

    // Fetch invoices and charges for each customer ID
    for (const customerId of customerIds) {
      console.log(`Fetching invoices for customer ID: ${customerId}`);
      
      try {
        // Fetch invoices for this customer
        const invoicesList = await stripe.invoices.list({
          customer: customerId,
          limit: 100,
        });
        
        console.log(`Retrieved ${invoicesList.data.length} invoices for customer ${customerId}`);
        allInvoices = [...allInvoices, ...invoicesList.data];
        
        // Fetch charges that might not be associated with invoices
        const chargesList = await stripe.charges.list({
          customer: customerId,
          limit: 100,
        });
        
        console.log(`Retrieved ${chargesList.data.length} charges for customer ${customerId}`);
        allCharges = [...allCharges, ...chargesList.data];
      } catch (error) {
        console.error(`Error fetching data for customer ${customerId}:`, error);
        // Continue with other customer IDs
      }
    }

    // Debug information
    if (allInvoices.length > 0) {
      const firstInvoice = allInvoices[0];
      console.log('Sample invoice structure:', {
        id: firstInvoice.id,
        number: firstInvoice.number,
        amount_paid: firstInvoice.amount_paid,
        amount_total: firstInvoice.total,
        status: firstInvoice.status,
      });
    }

    if (allCharges.length > 0) {
      const firstCharge = allCharges[0];
      console.log('Sample charge structure:', {
        id: firstCharge.id,
        amount: firstCharge.amount,
        status: firstCharge.status,
        paid: firstCharge.paid,
        receipt_url: firstCharge.receipt_url,
      });
    }

    // Find charges that don't have an associated invoice ID
    const standaloneCharges = allCharges.filter(charge => !charge.invoice);
    console.log(`Found ${standaloneCharges.length} standalone charges`);

    // Create a consistent structure for standalone charges
    const chargesAsInvoices = standaloneCharges.map(charge => {
      return {
        id: charge.id,
        number: `CH-${charge.id.slice(-8)}`,
        created: charge.created,
        amount_paid: charge.amount,
        status: charge.paid ? 'paid' : 'unpaid',
        hosted_invoice_url: charge.receipt_url || null,
        invoice_pdf: charge.receipt_url || null,
        currency: charge.currency,
        description: charge.description || 'One-time charge'
      };
    });

    if (chargesAsInvoices.length > 0) {
      console.log('Sample processed standalone charge:', chargesAsInvoices[0]);
    }

    // Combine invoices with standalone charges
    let mergedInvoices = [...allInvoices, ...chargesAsInvoices];

    // Sort by created date (newest first)
    mergedInvoices.sort((a, b) => (b.created || 0) - (a.created || 0));

    console.log(`Returning ${mergedInvoices.length} total invoice records`);

    // Ensure we always return an array
    if (!Array.isArray(mergedInvoices)) {
      console.error('mergedInvoices is not an array:', mergedInvoices);
      mergedInvoices = [];
    }

    return NextResponse.json({ invoices: mergedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
} 