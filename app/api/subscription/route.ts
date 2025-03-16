import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserSubscription, upgradeSubscription } from '@/lib/subscription';
import { ensureUserExists } from '@/lib/auth';

// Get user subscription details
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First ensure the user exists in our database
    const userData = await ensureUserExists();
    
    if (!userData.success) {
      console.error('Failed to ensure user exists:', userData.error);
      // Still try to get subscription directly
    }
    
    try {
      const subscriptionData = await getUserSubscription(userId);
      
      return NextResponse.json({
        success: true,
        data: subscriptionData
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Return default subscription data as fallback
      return NextResponse.json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          credits: 0.25,
          planInfo: {
            name: 'Free',
            description: 'Basic features with a 15-minute trial interview',
            credits: 0.25,
            features: [
              '15-minute trial interview',
              'Basic job preparation',
              'Limited feedback',
            ],
            price: 0,
          }
        }
      });
    }
  } catch (error) {
    console.error('Error in subscription route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}

// Upgrade user subscription
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { plan, stripeData } = body;
    
    if (!plan || !['basic', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }
    
    const user = await upgradeSubscription(
      userId, 
      plan as 'basic' | 'premium',
      stripeData
    );
    
    return NextResponse.json({
      success: true,
      message: `Subscription upgraded to ${plan}`,
      data: {
        plan: user.subscription?.plan,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
} 