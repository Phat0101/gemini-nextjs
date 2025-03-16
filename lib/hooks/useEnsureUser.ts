import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

/**
 * Hook to ensure a user exists in our database after authentication
 * More reliable than webhooks in serverless environments
 */
export function useEnsureUser() {
  const { isLoaded, userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Only run if auth is loaded and user is signed in
    if (!isLoaded || !isSignedIn || !userId || isEnsuring || isComplete) {
      return;
    }
    
    const ensureUser = async () => {
      try {
        setIsEnsuring(true);
        
        // Call our API to ensure user exists in database
        const response = await fetch('/api/account', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        // If user not found in our DB, create them
        if (response.status === 404 && data.shouldCreateAccount) {
          const createResponse = await fetch('/api/account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          const createData = await createResponse.json();
          
          if (createResponse.ok) {
            setIsNewUser(true);
          } else {
            throw new Error(createData.error || 'Failed to create user account');
          }
        } else if (!response.ok) {
          throw new Error(data.error || 'Failed to check user account');
        }
        
        setIsComplete(true);
      } catch (err) {
        console.error('Error ensuring user exists:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsEnsuring(false);
      }
    };
    
    ensureUser();
  }, [isLoaded, userId, isSignedIn, isEnsuring, isComplete, router]);
  
  return {
    isEnsuring,
    isComplete,
    isNewUser,
    error,
    user,
  };
} 