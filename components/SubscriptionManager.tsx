"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

type UserSubscription = {
  plan: string;
  status: string;
  credits: number;
  planInfo?: {
    name: string;
    description: string;
    features: string[];
    price: number;
  };
};

export const SubscriptionManager = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        setLoading(true);
        const response = await fetch('/api/subscription');

        if (!response.ok) {
          throw new Error('Failed to fetch subscription details');
        }

        const data = await response.json();

        // Ensure we have planInfo even if the API doesn't return it
        const planData = data.data || {};
        const planType = planData.plan || 'free';

        // Get plan info from constants if not provided by API
        if (!planData.planInfo) {
          planData.planInfo = planType === 'free'
            ? SUBSCRIPTION_PLANS.FREE
            : planType === 'basic'
              ? SUBSCRIPTION_PLANS.BASIC
              : SUBSCRIPTION_PLANS.PREMIUM;
        }

        setSubscription(planData);
      } catch (err) {
        setError('Unable to load subscription information');
        console.error('Error fetching subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [isLoaded, isSignedIn]);

  const handlePurchase = async (plan: 'basic' | 'premium') => {
    if (!isSignedIn || !userId) {
      setError('You must be signed in to purchase credits');
      return;
    }

    try {

      // Get the appropriate Stripe checkout URL based on the selected plan
      const stripeCheckoutUrl = plan === 'basic'
        ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PACKAGE_URL
        : process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PACKAGE_URL;

      if (!stripeCheckoutUrl) {
        throw new Error(`Stripe checkout URL for ${plan} plan is not configured`);
      }

      // Add the userId as a query parameter to be included in Stripe metadata
      const url = new URL(stripeCheckoutUrl);
      url.searchParams.append('client_reference_id', userId);

      // Add metadata explicitly if using checkout sessions
      if (url.pathname.includes('/checkout/sessions')) {
        url.searchParams.append('metadata[userId]', userId);
      }

      // Store the user's selection and userId in localStorage to verify after redirect back
      localStorage.setItem('pendingPurchase', plan);
      localStorage.setItem('purchasingUserId', userId);

      // Redirect to Stripe checkout with the userId included
      // window.location.href = url.toString();

      // Open in new tab
      window.open(url.toString(), '_blank');

    } catch (err) {
      setError('Unable to start the purchase process');
      console.error('Error initiating credit purchase:', err);
    }
  };

  // Check for successful payment return from Stripe
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // For Stripe checkout return
      const urlParams = new URLSearchParams(window.location.search);
      const redirectStatus = urlParams.get('redirect_status');

      // Different payment links might use different success indicators
      const isSuccess = redirectStatus === 'succeeded' ||
        urlParams.get('payment_status') === 'success' ||
        urlParams.get('success') === 'true';

      if (isSuccess) {
        try {
          // Clear URL parameters to prevent duplicate processing
          window.history.replaceState({}, document.title, window.location.pathname);

          // Get the pending purchase plan
          const pendingPlan = localStorage.getItem('pendingPurchase') as 'basic' | 'premium' | null;
          if (!pendingPlan) return;

          // Get the userId stored before redirect
          const storedUserId = localStorage.getItem('purchasingUserId');

          // Clear the stored data
          localStorage.removeItem('pendingPurchase');
          localStorage.removeItem('purchasingUserId');

          // Call API to finalize the purchase
          const response = await fetch('/api/subscription/upgrade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plan: pendingPlan,
              storedUserId: storedUserId // Include the stored userId for verification
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to finalize credit purchase');
          }

          // Refresh subscription data
          const data = await response.json();

          // Get plan info from constants
          const planData = data.data || {};
          const planType = planData.plan || 'free';

          if (!planData.planInfo) {
            planData.planInfo = planType === 'free'
              ? SUBSCRIPTION_PLANS.FREE
              : planType === 'basic'
                ? SUBSCRIPTION_PLANS.BASIC
                : SUBSCRIPTION_PLANS.PREMIUM;
          }

          setSubscription(planData);
          router.refresh();
        } catch (err) {
          setError('Payment was successful, but we couldn\'t update your account. Please contact support.');
          console.error('Error finalizing credit purchase after payment:', err);
        }
      }
    };

    if (isLoaded && isSignedIn) {
      checkPaymentStatus();
    }
  }, [isLoaded, isSignedIn, router]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-700">
        <p>You need to sign in to manage your interview credits.</p>
        <Button
          onClick={() => router.push('/sign-in')}
          className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (!subscription) {
    // Create a default subscription if none exists
    const defaultSubscription: UserSubscription = {
      plan: 'free',
      status: 'active',
      credits: 0.25,
      planInfo: SUBSCRIPTION_PLANS.FREE
    };

    setSubscription(defaultSubscription);
    return null;
  }

  // Use safe destructuring with default values
  const {
    plan = 'free',
    credits = plan === 'free' ? 0.25 : (plan === 'basic' ? 3 : 10),
    planInfo = SUBSCRIPTION_PLANS.FREE
  } = subscription;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Interview Credits</h2>
          <p className="text-sm text-zinc-500">Purchase interview credits to practice for your next job</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <p className="text-sm font-medium text-blue-700">
            You have {credits.toFixed(2)} interview credits remaining
          </p>
        </div>
      </div>

      {/* Current Plan */}
      <Card className="p-5 bg-white border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-zinc-900">
                Current Package: {planInfo?.name || 'Free'}
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{planInfo?.description || 'Basic features with a free trial'}</p>
          </div>

          {plan === 'free' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handlePurchase('basic')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Get Basic Credits
              </Button>
              <Button
                onClick={() => handlePurchase('premium')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Get Premium Credits
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-zinc-100 pt-4">
          <h4 className="text-sm font-medium text-zinc-800 mb-2">Features:</h4>
          <ul className="space-y-2">
            {(planInfo?.features || []).map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-600">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Available Packages */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-zinc-900 mb-4">Available Credit Packages</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Plan */}
          <Card className="p-5 bg-white border-zinc-200 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-zinc-900">{SUBSCRIPTION_PLANS.BASIC.name}</h4>
                <p className="text-zinc-500 text-sm">{SUBSCRIPTION_PLANS.BASIC.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900">${SUBSCRIPTION_PLANS.BASIC.price}</p>
                <p className="text-xs text-zinc-500">one-time purchase</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {SUBSCRIPTION_PLANS.BASIC.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-600">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handlePurchase('basic')}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Purchase
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="p-5 bg-white border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md w-fit">
              Best Value
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-zinc-900">{SUBSCRIPTION_PLANS.PREMIUM.name}</h4>
                <p className="text-zinc-500 text-sm">{SUBSCRIPTION_PLANS.PREMIUM.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900">${SUBSCRIPTION_PLANS.PREMIUM.price}</p>
                <p className="text-xs text-zinc-500">one-time purchase</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {SUBSCRIPTION_PLANS.PREMIUM.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-600">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handlePurchase('premium')}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Purchase
            </Button>
          </Card>
        </div>

        <p className="mt-4 text-sm text-zinc-500 flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4" />
          Secure payment processing with Stripe
        </p>
      </div>
    </div>
  );
}; 