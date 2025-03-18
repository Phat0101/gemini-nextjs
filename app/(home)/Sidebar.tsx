"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageSquare, User, Video, X, LogOut, LogIn, UserPlus, Settings, CreditCard } from "lucide-react";
import { UserButton, SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

// Navigation items that require authentication
const authenticatedNavItems = [
  {
    name: "Live Chat",
    href: "/live-chat",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
  },
  {
    name: "Interview Partner",
    href: "/live-interview",
    icon: <Video className="h-5 w-5" />,
  },
  // Add more navigation items as needed
];

// Navigation items for all users
// const publicNavItems = [
//   {
//     name: "Home",
//     href: "/",
//     icon: <Home className="h-5 w-5" />,
//   },
// ];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  // Default to free plan with 0.25 credits
  const [subscription, setSubscription] = useState({ plan: 'free', credits: 0.25 });
  const [isLoading, setIsLoading] = useState(true);

  // Close sidebar when changing routes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Fetch subscription data for signed-in users
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/subscription');
        
        if (!response.ok) {
          console.error('Failed to fetch subscription details');
          return;
        }
        
        const data = await response.json();
        const planData = data.data || {};
        
        // Ensure we have credits data with fallbacks to plan defaults
        const planType = planData.plan || 'free';
        const planCredits = typeof planData.credits === 'number' ? planData.credits : 
          (planType === 'free' ? SUBSCRIPTION_PLANS.FREE.credits : 
           planType === 'basic' ? SUBSCRIPTION_PLANS.BASIC.credits : 
           planType === 'premium' ? SUBSCRIPTION_PLANS.PREMIUM.credits : 0.25);
        
        
        setSubscription({
          plan: planType,
          credits: planCredits
        });
      } catch (err) {
        console.error('Error fetching subscription:', err);
        // Set default values on error
        setSubscription({
          plan: 'free',
          credits: 0.25 // Default free trial credits
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const hamburger = document.getElementById("hamburger-menu");

      if (
        sidebar &&
        hamburger &&
        !sidebar.contains(event.target as Node) &&
        !hamburger.contains(event.target as Node) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Helper to get plan name from plan type
  const getPlanName = (planType: string): string => {
    switch (planType) {
      case 'basic': return SUBSCRIPTION_PLANS.BASIC.name;
      case 'premium': return SUBSCRIPTION_PLANS.PREMIUM.name;
      default: return SUBSCRIPTION_PLANS.FREE.name;
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        id="hamburger-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white/70 shadow-md text-zinc-700 hover:bg-zinc-100/70 transition-colors duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed lg:sticky top-0 left-0 z-40 h-full w-64 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="h-full bg-white border-r border-zinc-200 shadow-sm flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-zinc-200">
            <Link href="/" className="flex items-center gap-2">
              <User className="h-8 w-8 rounded-full bg-blue-500 text-white p-1.5" />
              <span className="font-bold text-xl text-zinc-800">AI Interview Partner</span>
            </Link>
          </div>

          {/* Sign in/sign up buttons for signed out users */}
          <SignedOut>
            <div className="p-4 border-b border-zinc-200">
              <div className="space-y-2">
                <Link
                  href="/sign-in"
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            </div>
          </SignedOut>

          {/* Subscription information for signed-in users */}
          <SignedIn>
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-medium text-zinc-800">
                  {getPlanName(subscription.plan)} Plan
                </h3>
                {subscription.plan === 'free' && (
                  <Link
                    href="/settings"
                    className="ml-auto text-xs text-blue-600 hover:underline"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
              <div className="bg-blue-50 px-3 py-2 rounded-md text-xs font-medium text-blue-700 flex items-center justify-between">
                <span>{subscription.credits.toFixed(2)} Interview Credits</span>
                {isLoading && (
                  <div className="animate-spin h-3 w-3 border border-blue-700 rounded-full border-t-transparent"></div>
                )}
              </div>
            </div>
          </SignedIn>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {/* Authenticated navigation items */}
            <SignedIn>
              {authenticatedNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-5 bg-blue-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </SignedIn>
          </nav>

          {/* Footer with user info, settings, and sign out */}
          <div className="mt-auto">
            <SignedIn>
              <div className="p-4 border-t border-zinc-200">
                {/* User profile and settings */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserButton />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-800">
                        {user?.fullName}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    className="p-2 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                </div>

                {/* Sign out button */}
                <button
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </SignedIn>
            <div className="p-4 text-sm text-zinc-500">
              <p>© {new Date().getFullYear()} AI Interview Partner</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 