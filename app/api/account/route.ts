import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { initializeFreeUser } from '@/lib/subscription';

// Create a new user account
export async function POST() {
  try {
    const user = await currentUser();
    
    // Only allow creation for authenticated users
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    // Create new user with data from Clerk
    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.imageUrl || null,
      }
    });
    
    // Initialize the free plan with trial credits
    await initializeFreeUser(user.id);
    
    // Get the updated user with subscription
    const updatedUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { subscription: true }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Account created with free trial',
      user: {
        clerkId: newUser.clerkId,
        email: newUser.email,
        credits: updatedUser?.credits || 0,
        plan: updatedUser?.subscription?.plan || 'free'
      }
    });
  } catch (error) {
    console.error('Error creating user account:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
}

// Get current user data
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find user in database with relations
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: {
        subscription: true,
        jobPreparations: true,
        interviewSessions: true
      }
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', shouldCreateAccount: true },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        credits: dbUser.credits,
        subscription: dbUser.subscription,
        lastActive: dbUser.lastActive,
        jobPreparations: dbUser.jobPreparations.length,
        interviewSessions: dbUser.interviewSessions.length
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

// Update user data
export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Find user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id }
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: {
      lastActive: Date;
      notifications?: boolean;
      emailMarketing?: boolean;
      emailUpdates?: boolean;
      emailReminders?: boolean;
      timezone?: string;
    } = {
      lastActive: new Date()
    };
    
    // Update allowed fields
    if (body.settings) {
      updateData.notifications = body.settings.notifications ?? dbUser.notifications;
      updateData.emailMarketing = body.settings.emailPreferences?.marketing ?? dbUser.emailMarketing;
      updateData.emailUpdates = body.settings.emailPreferences?.updates ?? dbUser.emailUpdates;
      updateData.emailReminders = body.settings.emailPreferences?.sessionReminders ?? dbUser.emailReminders;
      updateData.timezone = body.settings.timezone ?? dbUser.timezone;
    }
    
    // Update user
    await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      message: 'User data updated'
    });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}

// Delete user account
export async function DELETE() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find and delete user
    await prisma.user.delete({
      where: { clerkId: user.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
} 