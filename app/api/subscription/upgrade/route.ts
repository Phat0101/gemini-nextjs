import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { upgradeSubscription, getUserSubscription } from '@/lib/subscription';

/**
 * API endpoint to finalize credit purchases after successful Stripe payment
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await req.json();
    const { plan, storedUserId } = body;
    
    if (!plan || (plan !== 'basic' && plan !== 'premium')) {
      return NextResponse.json(
        { error: 'Invalid plan specified' },
        { status: 400 }
      );
    }
    
    // Verify the storedUserId matches the authenticated userId
    if (storedUserId && storedUserId !== userId) {
      console.warn(`UserId mismatch: authenticated ${userId} vs stored ${storedUserId}`);
      // Continue with the authenticated userId, but log the discrepancy
    }
    
    // Add interview credits based on the purchased plan
    const user = await upgradeSubscription(userId, plan);
    console.log('Credits added:', user);
    
    // Get updated subscription info
    const subscription = await getUserSubscription(userId);
    
    return NextResponse.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add interview credits' },
      { status: 500 }
    );
  }
} 