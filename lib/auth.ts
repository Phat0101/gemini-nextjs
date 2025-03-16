import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PLANS } from './subscription';

/**
 * Ensures a user exists in our database after sign-in
 * This is a more reliable approach than using webhooks in serverless environments
 */
export async function ensureUserExists() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    });
    
    if (existingUser) {
      // Update last active timestamp
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastActive: new Date() }
      });
      
      return { 
        success: true, 
        user: updatedUser, 
        isNewUser: false 
      };
    }
    
    // Get free plan credits
    const freeCredits = SUBSCRIPTION_PLANS.FREE.credits;
    
    // Create new user using Clerk data with free plan in a single transaction
    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.imageUrl || null,
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
    
    console.log('Created new user with free plan:', newUser.id);
    
    return { 
      success: true, 
      user: newUser, 
      isNewUser: true 
    };
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return { 
      success: false, 
      error: 'Failed to ensure user exists'
    };
  }
} 