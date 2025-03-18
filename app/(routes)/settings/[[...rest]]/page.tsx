"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, CreditCard, User, Settings } from "lucide-react";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { useEnsureUser } from "@/lib/hooks/useEnsureUser";

export default function SettingsPage() {
  const { isLoaded, userId } = useAuth();
  const { isEnsuring, error } = useEnsureUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'settings'>('profile');
  
  // Ensure automatic account creation when user visits settings
  useEffect(() => {
    if (error) {
      console.error('Error ensuring user exists:', error);
    }
  }, [error]);
  
  const renderContent = () => {
    if (!isLoaded || isEnsuring) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!userId) {
      return (
        <div className="text-center py-12">
          <p className="text-zinc-600">Please sign in to access your settings</p>
        </div>
      );
    }
    
    if (activeTab === 'profile') {
      return (
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
      );
    }
    
    if (activeTab === 'subscription') {
      return <SubscriptionManager />;
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Application Settings</h2>
        <p className="text-zinc-500">Additional settings will be available soon.</p>
      </div>
    );
  };
  
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
      
      <div className="flex flex-col md:flex-row w-full">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white border-r border-zinc-200">
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'profile' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-zinc-700 hover:bg-zinc-50'}`}
                >
                  <User className="h-5 w-5" />
                  Profile
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'subscription' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-zinc-700 hover:bg-zinc-50'}`}
                >
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'settings' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-zinc-700 hover:bg-zinc-50'}`}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 max-w-4xl">
          {renderContent()}
        </main>
      </div>
    </div>
  );
} 