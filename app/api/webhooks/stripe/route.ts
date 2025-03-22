import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { upgradeSubscription } from '@/lib/subscription';

// Verify environment variables are set
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('Missing STRIPE_WEBHOOK_SECRET in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Log when the module is loaded (helpful for Vercel deployment debugging)
console.log(`Stripe webhook module loaded. Webhook secret available: ${!!endpointSecret}`);

// Modified helper to get raw request body as string (simpler for Vercel)
async function getRawBody(req: NextRequest): Promise<string> {
  try {
    const text = await req.text();
    console.log(`Raw body retrieved, length: ${text.length} bytes`);
    return text;
  } catch (error) {
    console.error('Error getting raw body:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    // For Vercel debugging
    console.log('Processing Stripe webhook POST request');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Get raw body for signature verification (as string)
    const rawBody = await getRawBody(req);
    console.log(`Raw body length: ${rawBody.length} characters`);
    
    if (!rawBody.length) {
      console.error('Empty request body received');
      return NextResponse.json(
        { error: 'No request body received' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
          }
        }
      );
    }
    
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature') || '';
    
    if (!signature) {
      console.error('No Stripe signature in request headers');
      return NextResponse.json(
        { error: 'No Stripe signature provided' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
          }
        }
      );
    }
    
    // Log details for debugging
    console.log(`Signature found, length: ${signature.length}`);
    
    let event;
    
    try {
      // Verify webhook signature (using string rawBody instead of Buffer)
      event = stripe.webhooks.constructEvent(
        rawBody, 
        signature, 
        endpointSecret
      );
      
      console.log(`✅ Webhook verified: ${event.type}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`⚠️ Webhook signature verification failed: ${errorMessage}`);
      
      return NextResponse.json(
        { error: `Webhook Error: ${errorMessage}` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
          }
        }
      );
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💰 Payment successful: ${session.id}`);
        
        // Determine which plan based on the amount paid
        const amountPaid = session.amount_total || 0;
        let plan: 'basic' | 'premium' = 'basic';
        
        // Convert to dollars for comparison (Stripe amounts are in cents)
        const paymentAmount = amountPaid / 100;
        
        // Determine plan based on amount
        if (paymentAmount >= 30) {
          plan = 'premium';
        } else {
          plan = 'basic';
        }
        
        console.log(`Determined plan from payment amount ${paymentAmount}: ${plan}`);
        
        try {
          // Try multiple approaches to identify the user
          
          // 1. First try: Get userId from metadata
          const userIdFromMetadata = session.metadata?.userId || session.client_reference_id;
          
          if (userIdFromMetadata) {
            console.log(`Processing payment for userId from metadata: ${userIdFromMetadata}`);
            
            // Save the customer ID to our new StripeCustomer model
            if (session.customer) {
              const customerId = session.customer as string;
              
              // Check if this customer ID is already saved for the user
              const existingCustomer = await prisma.stripeCustomer.findUnique({
                where: { stripeCustomerId: customerId }
              });
              
              if (!existingCustomer) {
                // Get the user's internal DB ID from Clerk ID
                const dbUser = await prisma.user.findUnique({
                  where: { clerkId: userIdFromMetadata },
                  select: { id: true }
                });
                
                if (dbUser) {
                  // Save the new customer ID
                  await prisma.stripeCustomer.create({
                    data: {
                      stripeCustomerId: customerId,
                      userId: dbUser.id
                    }
                  });
                  console.log(`Added new Stripe customer ID ${customerId} for user ${userIdFromMetadata}`);
                }
              }
            }
            
            await upgradeSubscription(
              userIdFromMetadata, 
              plan,
              {
                customerId: session.customer as string,
                subscriptionId: session.id,
                priceId: session.line_items?.data[0]?.price?.id || '',
                currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              }
            );
            
            console.log(`✅ Successfully added credits for user ${userIdFromMetadata} with plan ${plan}`);
            return NextResponse.json(
              { received: true },
              {
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
                }
              }
            );
          }
          
          // 2. Second try: Find user by email
          console.log('No userId found in metadata. Trying email lookup...');
          const customerEmail = session.customer_details?.email;
          
          if (customerEmail) {
            // Find all users to check for a match
            const allUsers = await prisma.user.findMany({
              select: { id: true, email: true, clerkId: true }
            });
            
            console.log(`Searching for a match among ${allUsers.length} users with email: ${customerEmail}`);
            
            // Try exact match first
            const exactMatch = allUsers.find(user => 
              user.email && user.email.toLowerCase() === customerEmail.toLowerCase()
            );
            
            if (exactMatch) {
              console.log(`Found exact email match for user: ${exactMatch.clerkId}`);
              
              // Save the customer ID to our new StripeCustomer model
              if (session.customer) {
                const customerId = session.customer as string;
                
                // Check if this customer ID is already saved for the user
                const existingCustomer = await prisma.stripeCustomer.findUnique({
                  where: { stripeCustomerId: customerId }
                });
                
                if (!existingCustomer) {
                  // Save the new customer ID
                  await prisma.stripeCustomer.create({
                    data: {
                      stripeCustomerId: customerId,
                      userId: exactMatch.id
                    }
                  });
                  console.log(`Added new Stripe customer ID ${customerId} for user ${exactMatch.clerkId}`);
                }
              }
              
              await upgradeSubscription(
                exactMatch.clerkId, 
                plan,
                {
                  customerId: session.customer as string,
                  subscriptionId: session.id,
                  priceId: session.line_items?.data[0]?.price?.id || '',
                  currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
              );
              
              console.log(`✅ Successfully added credits for ${exactMatch.email} with plan ${plan}`);
              return NextResponse.json({ received: true });
            } else {
              // If no exact match, log emails for debugging
              console.log('Available user emails:', allUsers.map(u => u.email).join(', '));
              console.error(`❌ No exact match found for email: ${customerEmail}`);
            }
          } else {
            console.error('❌ No customer email available in the session');
          }
          
          // 3. If we got here, we couldn't identify the user
          console.error('❌ Unable to identify user for payment. Please check logs and update manually.');
        } catch (err) {
          console.error('Error processing checkout.session.completed:', err);
        }
        break;
      }
      
      // Add support for payment_intent.succeeded which also comes from Stripe Payment Links
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);
        
        // Note: For payment_intent events, we need to link them to the checkout session
        // This is complicated as we don't have direct access to the user data here
        // For now, we'll log this event but the actual processing happens in checkout.session.completed
        console.log(`Payment for amount ${paymentIntent.amount / 100} received.`);
        break;
      }
      
      // Handle payment method events to store payment method info
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`💳 Payment method attached: ${paymentMethod.id}`);
        
        // Store payment method info if needed
        const customerId = paymentMethod.customer as string;
        if (customerId) {
          try {
            // Find the user with this Stripe customer ID
            const subscription = await prisma.subscription.findFirst({
              where: { stripeCustomerId: customerId },
              include: { user: true }
            });
            
            if (subscription) {
              // Save payment method details to your database if needed
              console.log(`✅ Payment method ${paymentMethod.id} attached to customer ${customerId} (User: ${subscription.user.email})`);
              
              // You can store payment method info if needed
              await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                  // Store last 4 digits of card, brand, etc. if needed
                  // This can be used to display payment method info in the UI
                  paymentMethodId: paymentMethod.id,
                  paymentMethodDetails: JSON.stringify({
                    type: paymentMethod.type,
                    last4: paymentMethod.card?.last4 || '',
                    brand: paymentMethod.card?.brand || '',
                    expMonth: paymentMethod.card?.exp_month || 0,
                    expYear: paymentMethod.card?.exp_year || 0
                  })
                }
              });
            }
          } catch (err) {
            console.error('Error processing payment method attachment:', err);
          }
        }
        break;
      }
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json(
      { received: true },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
        }
      }
    );
  } catch (err: unknown) {
    console.error(`❌ Error processing webhook:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
      },
    }
  );
}

// Ensure Next.js doesn't parse the body automatically
export const config = {
  api: {
    bodyParser: false,
  },
};