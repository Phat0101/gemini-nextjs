"use client";

import { UserProfile } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { isLoaded, userId } = useAuth();
  
  return (
    <div className="w-full h-full">
      <header className="py-4 px-4 sm:py-6 sm:px-6 border-b border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-800">
            Account Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your profile and account preferences
          </p>
        </div>
        
        <Link 
          href="/live-chat" 
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </header>
      
      <main className="p-4 sm:p-6 max-w-4xl mx-auto">
        {!isLoaded ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : userId ? (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <UserProfile 
              path="/settings"
              routing="path"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-none",
                  navbar: "hidden",
                  navbarMobileMenuButton: "hidden",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                }
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-600">Please sign in to access your settings</p>
          </div>
        )}
      </main>
    </div>
  );
} 