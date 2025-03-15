import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId, sessionId } = await auth();
    
    if (!userId || !sessionId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Revoke the current session
    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);
    
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("Error during sign out:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sign out" },
      { status: 500 }
    );
  }
} 