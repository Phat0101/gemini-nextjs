import { prisma } from '@/lib/prisma';

// Define minutes available for each plan
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    description: 'Basic features with a 15-minute trial interview',
    credits: 0.25, // 15 minutes (0.25 hours)
    features: [
      '15-minute trial interview',
      'Basic job preparation',
      'Limited feedback',
    ],
    price: 0,
  },
  BASIC: {
    name: 'Basic',
    description: 'Essential features for casual job seekers',
    credits: 3, // 3 hours
    features: [
      '3 hours of interview practice',
      'Full job preparation',
      'Basic AI feedback',
      'Interview recordings',
    ],
    price: 9.99,
  },
  PREMIUM: {
    name: 'Premium',
    description: 'Complete package for serious job hunters',
    credits: 10, // 10 hours
    features: [
      '10 hours of interview practice',
      'Advanced AI feedback',
      'Interview recordings',
      'Transcript generation',
      'Resume review',
      'Unlimited job preparations',
    ],
    price: 19.99,
  }
};

/**
 * Initialize a new user with the free trial
 * @param clerkId The user's Clerk ID
 */
export async function initializeFreeUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if user already has a subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: user.id }
  });
  
  // Initialize free plan settings if not already set
  if (!existingSubscription) {
    // Ensure credits is explicitly a floating point number
    const freeCredits = SUBSCRIPTION_PLANS.FREE.credits;
    
    // Update user with free plan
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: freeCredits,
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
            cancelAtPeriodEnd: false
          }
        }
      },
      include: {
        subscription: true
      }
    });
    
    console.log('Setting free credits:', freeCredits);
    
    return updatedUser;
  }
  
  return await prisma.user.findUnique({
    where: { id: user.id },
    include: { subscription: true }
  });
}

/**
 * Upgrade a user's subscription plan
 * @param clerkId The user's Clerk ID
 * @param planType The plan to upgrade to ('basic' or 'premium')
 * @param stripeData Optional Stripe subscription data
 */
export async function upgradeSubscription(
  clerkId: string, 
  planType: 'basic' | 'premium',
  stripeData?: {
    customerId: string;
    subscriptionId: string;
    priceId: string;
    currentPeriodEnd: Date;
  }
) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Update subscription
  const planCredits = planType === 'basic' 
    ? SUBSCRIPTION_PLANS.BASIC.credits 
    : SUBSCRIPTION_PLANS.PREMIUM.credits;
  
  if (user.subscription) {
    // Update existing subscription
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: planCredits,
        subscription: {
          update: {
            plan: planType,
            status: 'active',
            cancelAtPeriodEnd: false,
            ...(stripeData && {
              stripeCustomerId: stripeData.customerId,
              stripeSubscriptionId: stripeData.subscriptionId,
              stripePriceId: stripeData.priceId,
              stripeCurrentPeriodEnd: stripeData.currentPeriodEnd
            })
          }
        }
      },
      include: { subscription: true }
    });
    
    return updatedUser;
  } else {
    // Create new subscription
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: planCredits,
        subscription: {
          create: {
            plan: planType,
            status: 'active',
            cancelAtPeriodEnd: false,
            ...(stripeData && {
              stripeCustomerId: stripeData.customerId,
              stripeSubscriptionId: stripeData.subscriptionId,
              stripePriceId: stripeData.priceId,
              stripeCurrentPeriodEnd: stripeData.currentPeriodEnd
            })
          }
        }
      },
      include: { subscription: true }
    });
    
    return updatedUser;
  }
}

/**
 * Calculate and deduct credits for interview time
 * @param clerkId The user's Clerk ID
 * @param durationMinutes Duration of the interview in minutes
 */
export async function deductInterviewTime(clerkId: string, durationMinutes: number) {
  const user = await prisma.user.findUnique({
    where: { clerkId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Convert minutes to hours (credits)
  const creditsToDeduct = parseFloat((durationMinutes / 60).toFixed(2));
  
  // Check if user has enough credits
  if (user.credits < creditsToDeduct) {
    throw new Error('Insufficient credits for this interview duration');
  }
  
  // Deduct credits with precision handling
  const remainingCredits = parseFloat((user.credits - creditsToDeduct).toFixed(2));
  
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { credits: remainingCredits }
  });
  
  return {
    creditsUsed: creditsToDeduct,
    remainingCredits: updatedUser.credits
  };
}

/**
 * Get subscription information for a user
 * @param clerkId The user's Clerk ID
 */
export async function getUserSubscription(clerkId: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true }
  });
  
  // Auto-create user account if not found
  if (!user) {
    console.log('User not found in getUserSubscription - creating new account');
    // Get free plan credits
    const freeCredits = SUBSCRIPTION_PLANS.FREE.credits;
    
    try {
      // Try to get Clerk user info
      // If Clerk ID is valid but user doesn't exist in our DB, create them
      user = await prisma.user.create({
        data: {
          clerkId,
          email: '',  // Will be updated later with webhook
          credits: freeCredits,
          subscription: {
            create: {
              plan: 'free',
              status: 'active',
              cancelAtPeriodEnd: false
            }
          }
        },
        include: { subscription: true }
      });
      
      console.log('Auto-created user account with free plan');
    } catch (error) {
      console.error('Failed to auto-create user account:', error);
      throw new Error('User not found and could not be created');
    }
  }
  
  const planType = user.subscription?.plan || 'free';
  const planInfo = planType === 'free' 
    ? SUBSCRIPTION_PLANS.FREE 
    : planType === 'basic' 
      ? SUBSCRIPTION_PLANS.BASIC 
      : SUBSCRIPTION_PLANS.PREMIUM;
  
  return {
    plan: planType,
    status: user.subscription?.status || 'inactive',
    credits: user.credits,
    planInfo,
    stripeInfo: user.subscription ? {
      customerId: user.subscription.stripeCustomerId,
      subscriptionId: user.subscription.stripeSubscriptionId,
      currentPeriodEnd: user.subscription.stripeCurrentPeriodEnd,
    } : null
  };
}

/**
 * Start a new interview session for a user
 * @param clerkId The user's Clerk ID
 * @param jobPreparationId Optional job preparation ID to link with the session
 */
export async function startInterviewSession(clerkId: string, jobPreparationId?: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // If no job preparation is provided, create a temporary one
  let prepId = jobPreparationId;
  
  if (!prepId) {
    // Create a temporary job preparation
    const tempPrep = await prisma.jobPreparation.create({
      data: {
        title: 'General Interview Practice',
        company: 'Practice Session',
        description: 'General interview practice session',
        notes: 'Auto-created for interview practice',
        user: { connect: { id: user.id } }
      }
    });
    
    prepId = tempPrep.id;
  }
  
  // Create the interview session
  const session = await prisma.interviewSession.create({
    data: {
      startTime: new Date(),
      status: 'in_progress',
      jobPreparation: { connect: { id: prepId } },
      user: { connect: { id: user.id } }
    }
  });
  
  return session;
}

/**
 * End an interview session and calculate credits used
 * @param sessionId The ID of the interview session
 */
export async function endInterviewSession(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });
  
  if (!session) {
    throw new Error('Interview session not found');
  }
  
  // Set end time and calculate duration
  const endTime = new Date();
  
  // Calculate duration in minutes
  const startTime = session.startTime;
  const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  
  // Calculate credits used (1 hour = 1 credit) with 2 decimal precision
  const creditsUsed = parseFloat((durationMinutes / 60).toFixed(2));
  
  // Update the session
  const updatedSession = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      endTime,
      status: 'completed',
      duration: durationMinutes,
      creditsUsed
    }
  });
  
  // Now deduct credits from the user
  if (session.userId) {
    try {
      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate new credits
      const newCredits = parseFloat(Math.max(0, user.credits - creditsUsed).toFixed(2));
      
      // Update user credits
      const updatedUser = await prisma.user.update({
        where: { id: session.userId },
        data: { credits: newCredits }
      });
      
      return {
        session: updatedSession,
        durationMinutes,
        creditsUsed,
        remainingCredits: updatedUser.credits
      };
    } catch (error) {
      console.error('Could not deduct credits:', error);
      
      // Set credits to 0 if not enough
      await prisma.user.update({
        where: { id: session.userId },
        data: { credits: 0 }
      });
      
      return {
        session: updatedSession,
        durationMinutes,
        creditsUsed,
        remainingCredits: 0
      };
    }
  }
  
  // Fallback if no user is found
  return {
    session: updatedSession,
    durationMinutes,
    creditsUsed,
    remainingCredits: 0
  };
} 