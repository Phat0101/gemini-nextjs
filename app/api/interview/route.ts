import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  startInterviewSession, 
  endInterviewSession,
  deductInterviewTime
} from '@/lib/subscription';
import { prisma } from '@/lib/prisma';
import { ensureUserExists } from '@/lib/auth';

// Start a new interview session
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First ensure the user exists
    const userResult = await ensureUserExists();
    if (!userResult.success) {
      console.log('Failed to ensure user exists, trying direct access');
    }
    
    const body = await req.json();
    const { jobPreparationId } = body;
    
    if (!jobPreparationId) {
      return NextResponse.json(
        { error: 'Job preparation ID is required' },
        { status: 400 }
      );
    }
    
    // Verify job prep exists and belongs to user
    const jobPrep = await prisma.jobPreparation.findUnique({
      where: {
        id: jobPreparationId,
        user: {
          clerkId: userId
        }
      }
    });
    
    if (!jobPrep) {
      return NextResponse.json(
        { error: 'Job preparation not found' },
        { status: 404 }
      );
    }
    
    // Check if user has sufficient credits before starting
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (user.credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits to start interview' },
        { status: 402 }
      );
    }
    
    // Start the session
    const session = await startInterviewSession(userId, jobPreparationId);
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        startTime: session.startTime,
        remainingCredits: user.credits
      }
    });
  } catch (error) {
    console.error('Error starting interview session:', error);
    return NextResponse.json(
      { error: 'Failed to start interview session' },
      { status: 500 }
    );
  }
}

// Update interview credits (deduct time)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { minutes } = body;
    
    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
      return NextResponse.json(
        { error: 'Valid minutes value is required' },
        { status: 400 }
      );
    }
    
    try {
      // Deduct credits for the time used
      const result = await deductInterviewTime(userId, minutes);
      
      return NextResponse.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient credits for this interview duration') {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 402 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating interview credits:', error);
    return NextResponse.json(
      { error: 'Failed to update interview credits' },
      { status: 500 }
    );
  }
}

// End an interview session
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the session belongs to this user
    const session = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        user: {
          clerkId: userId
        }
      }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // End the session and calculate credits
    const result = await endInterviewSession(sessionId);
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        duration: result.durationMinutes,
        creditsUsed: result.creditsUsed,
        remainingCredits: result.remainingCredits,
        endTime: result.session.endTime
      }
    });
  } catch (error) {
    console.error('Error ending interview session:', error);
    return NextResponse.json(
      { error: 'Failed to end interview session' },
      { status: 500 }
    );
  }
} 