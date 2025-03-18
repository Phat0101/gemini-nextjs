import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { upgradeSubscription } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Helper to get raw request body as buffer
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  
  if (!reader) {
    return Buffer.from('');
  }
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature') || '';
    
    let event;
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        rawBody, 
        signature, 
        endpointSecret
      );
      
      console.log(`✅ Webhook verified: ${event.type}`);
    } catch (err: unknown) {
      console.error(`⚠️ Webhook signature verification failed:`, err);
      return NextResponse.json(
        { error: `Webhook Error: ${err}` },
        { status: 400 }
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
            return NextResponse.json({ received: true });
          }
          
          // 2. Second try: Find user by email
          console.log('No userId found in metadata. Trying email lookup...');
          const customerEmail = session.customer_details?.email;
          
          if (customerEmail) {
            // Find all users to check for a match
            const allUsers = await prisma.user.findMany({
              select: { email: true, clerkId: true }
            });
            
            console.log(`Searching for a match among ${allUsers.length} users with email: ${customerEmail}`);
            
            // Try exact match first
            const exactMatch = allUsers.find(user => 
              user.email && user.email.toLowerCase() === customerEmail.toLowerCase()
            );
            
            if (exactMatch) {
              console.log(`Found exact email match for user: ${exactMatch.clerkId}`);
              
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
    
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error(`❌ Error processing webhook:`, err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable automatic body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};