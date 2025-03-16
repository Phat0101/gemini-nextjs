import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserExists } from '@/lib/auth';

// Create a new job preparation
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Ensure user exists in our database
    const userData = await ensureUserExists();
    
    if (!userData.success) {
      return NextResponse.json(
        { error: 'User account issue', details: userData.error },
        { status: 500 }
      );
    }
    
    const body = await req.json();
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Extract fields with defaults
    const { 
      title = 'Interview Practice',
      company = 'General Practice', 
      description = 'Practice interview session',
      notes = '',
    } = body;
    
    // Create a new job preparation
    const jobPreparation = await prisma.jobPreparation.create({
      data: {
        title,
        company,
        description,
        notes,
        user: { connect: { id: user.id } }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Job preparation created',
      data: {
        id: jobPreparation.id,
        title: jobPreparation.title
      }
    });
  } catch (error) {
    console.error('Error creating job preparation:', error);
    return NextResponse.json(
      { error: 'Failed to create job preparation' },
      { status: 500 }
    );
  }
}

// Get all job preparations for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        jobPreparations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: user.jobPreparations
    });
  } catch (error) {
    console.error('Error fetching job preparations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job preparations' },
      { status: 500 }
    );
  }
} 