"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardIcon, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  
  useEffect(() => {
    const fetchSubscription = async () => {
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
        
        // Ensure free plan shows exactly the amount of credits
        // if (planType === 'free' && (!planData.credits || planData.credits < 0.25)) {
        //   planData.credits = 0.25;
        // }
        
        
        setSubscription(planData);
      } catch (err) {
        setError('Unable to load subscription information');
        console.error('Error fetching subscription:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, []);
  
  const handleUpgrade = async (plan: 'basic' | 'premium') => {
    try {
      setUpgrading(true);
      
      // For demonstration purposes - in production, this would redirect to Stripe
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to upgrade subscription');
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
      
      // Refresh the page to show updated information
      router.refresh();
    } catch (err) {
      setError('Unable to upgrade subscription');
      console.error('Error upgrading subscription:', err);
    } finally {
      setUpgrading(false);
    }
  };
  
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
          <h2 className="text-xl font-semibold text-zinc-900">Subscription</h2>
          <p className="text-sm text-zinc-500">Manage your interview practice plan</p>
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
                Current Plan: {planInfo?.name || 'Free'}
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
                onClick={() => handleUpgrade('basic')}
                disabled={upgrading}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Upgrade to Basic
                {upgrading && (
                  <div className="ml-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
              </Button>
              <Button 
                onClick={() => handleUpgrade('premium')}
                disabled={upgrading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Upgrade to Premium
                {upgrading && (
                  <div className="ml-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
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
      
      {/* Always show Upgrade Plans section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-zinc-900 mb-4">Upgrade Your Plan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Plan */}
          <Card className={`p-5 bg-white border-zinc-200 ${plan !== 'basic' ? 'hover:border-blue-400 hover:shadow-md transition-all' : 'border-blue-300'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-zinc-900">{SUBSCRIPTION_PLANS.BASIC.name}</h4>
                <p className="text-zinc-500 text-sm">{SUBSCRIPTION_PLANS.BASIC.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900">${SUBSCRIPTION_PLANS.BASIC.price}</p>
                <p className="text-xs text-zinc-500">per month</p>
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
              onClick={() => handleUpgrade('basic')}
              disabled={upgrading || plan === 'basic'}
              className={`mt-4 w-full ${plan === 'basic' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-sm`}
            >
              {plan === 'basic' ? 'Current Plan' : 'Upgrade to Basic'}
              {upgrading && plan !== 'basic' && (
                <div className="ml-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              )}
            </Button>
          </Card>
            
          {/* Premium Plan */}
          <Card className={`p-5 bg-white border ${plan === 'premium' ? 'border-blue-300' : 'border-blue-200 hover:border-blue-400 hover:shadow-md transition-all'}`}>
            {plan !== 'premium' && (
              <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md w-fit">
                Best Value
              </div>
            )}
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-zinc-900">{SUBSCRIPTION_PLANS.PREMIUM.name}</h4>
                <p className="text-zinc-500 text-sm">{SUBSCRIPTION_PLANS.PREMIUM.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900">${SUBSCRIPTION_PLANS.PREMIUM.price}</p>
                <p className="text-xs text-zinc-500">per month</p>
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
              onClick={() => handleUpgrade('premium')}
              disabled={upgrading || plan === 'premium'}
              className={`mt-4 w-full ${plan === 'premium' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-sm`}
            >
              {plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
              {upgrading && plan !== 'premium' && (
                <div className="ml-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              )}
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