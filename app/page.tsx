'use client'

// Import type only, not the actual SDK
import type { WebAppUser } from '@twa-dev/types';
import { useEffect, useState, useCallback, MouseEvent } from 'react';
// Import the newly created components for logged-in and logged-out states
// Link import removed as it's handled within the sub-components now
import HomePageLoggedIn from '@/app/components/HomePageLoggedIn';
import HomePageLoggedOut from '@/app/components/HomePageLoggedOut';

// Define the structure for user data obtained from the Telegram Web App SDK
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  added_to_attachment_menu?: boolean;
}

/**
 * Main Home Page component.
 * Handles Telegram Web App SDK initialization, user authentication state,
 * and renders different views based on whether the user is logged in or not.
 */
export default function HomePage() {
  // State for storing user data from Telegram SDK
  const [userData, setUserData] = useState<UserData | null>(null);
  // State to track if the user is registered and logged in within our app
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // State to hold the Telegram Web App SDK instance
  const [webAppSdk, setWebAppSdk] = useState<any>(null);
  // State to manage loading status during SDK initialization and API calls
  const [isLoading, setIsLoading] = useState(true);

  // Effect hook to initialize the Telegram Web App SDK on the client-side
  useEffect(() => {
    // Prevent SDK initialization during server-side rendering or prerendering
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Dynamically import the SDK on client-side only to avoid issues with server-side rendering
    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebApp = SdkModule.default;
        setWebAppSdk(WebApp); // Store the SDK instance in state
        WebApp.ready(); // Signal to Telegram that the app is ready to be shown

        // Check if user data is available in the SDK's initData
        if (WebApp.initDataUnsafe?.user) {
          const telegramUser = WebApp.initDataUnsafe.user as UserData;
          const { id } = telegramUser;

          // Check with our backend API if this Telegram user is already registered
          fetch(`/api/register?telegramId=${id}`)
            .then((response) => {
              if (!response.ok) {
                // Throw an error if the API response is not successful
                throw new Error(`API request failed with status ${response.status}`);
              }
              return response.json(); // Parse the JSON response
            })
            .then((data) => {
              setUserData(telegramUser); // Store Telegram user data regardless of registration status
              if (data.exists) {
                // User exists in our database, set login state to true
                setIsLoggedIn(true);
              }
              // If user doesn't exist, isLoggedIn remains false, userData is set for potential registration
              setIsLoading(false); // Loading finished successfully
            })
            .catch(error => {
              console.error('Error fetching user registration status:', error);
              // Still set user data even if check fails, allows potential registration attempt
              setUserData(telegramUser);
              setIsLoading(false); // Loading finished despite error during fetch
            });
        } else {
          // No user data found in SDK (e.g., opened outside Telegram)
          console.log('No Telegram user data found in SDK.');
          setIsLoading(false); // Loading finished, user is not logged in via Telegram
        }
      })
      .catch(error => {
        console.error('Error loading Telegram WebApp SDK:', error);
        setIsLoading(false); // Loading finished due to SDK loading error
      });
  }, []); // Empty dependency array ensures this effect runs only once on component mount

  // Handler function for user registration, wrapped in useCallback for performance optimization
  const handleRegister = useCallback(async () => {
    if (!userData) {
      console.error('Registration attempt without user data.');
      webAppSdk?.showAlert('Cannot register without Telegram data.');
      return; // Exit if no user data is available
    }

    setIsLoading(true); // Indicate loading state during the API call
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData), // Send Telegram user data to the backend for registration
      });

      if (response.ok) {
        setIsLoggedIn(true); // Registration successful, update login state
        webAppSdk?.showAlert('Account created successfully!'); // Notify user via Telegram UI
      } else {
        // Handle registration failure
        // Try to parse error message from response, provide fallback
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('Registration failed:', response.status, errorData);
        webAppSdk?.showAlert(`Registration failed: ${errorData.message || 'Server error'}`);
      }
    } catch (error) {
      console.error('Network or other error during registration:', error);
      webAppSdk?.showAlert('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false); // Reset loading state regardless of the outcome
    }
  }, [userData, webAppSdk]); // Dependencies: Recreate this function if userData or webAppSdk changes

  // Handler function for the Wallet link click, wrapped in useCallback
  const handleWalletClick = useCallback(async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent the default link navigation behavior
    if (!userData?.id) {
        console.error('Wallet click without user ID.');
        webAppSdk?.showAlert('User information not available.');
        return; // Exit if user ID is missing
    }

    setIsLoading(true); // Indicate loading state
    try {
      // Call the backend API to create or ensure the user's wallet exists
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: userData.id }) // Send user's Telegram ID
      });

      if (response.ok) {
        // Wallet operation successful (either created or already exists)
        webAppSdk?.showAlert('Wallet ready!'); // Optional confirmation message
        // Navigate to the wallet page programmatically after success
        // Consider using Next.js router if available and preferred: router.push('/wallet');
        window.location.href = '/wallet';
      } else {
        // Handle wallet operation failure
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('Wallet operation failed:', response.status, errorData);
        webAppSdk?.showAlert(`Wallet operation failed: ${errorData.message || 'Server error'}`);
      }
    } catch (error) {
      console.error('Network or other error during wallet operation:', error);
      webAppSdk?.showAlert('An error occurred while accessing the wallet. Please try again.');
    } finally {
      setIsLoading(false); // Reset loading state
    }
  }, [userData, webAppSdk]); // Dependencies: Recreate function if userData or webAppSdk changes

  // Render a loading indicator while the SDK initializes or API calls are in progress
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          {/* Simple loading text with pulse animation */}
          <p className="text-xl animate-pulse">Loading App...</p>
        </div>
      </main>
    );
  }

  // Main render logic: Conditionally render LoggedIn or LoggedOut component based on state
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
      {/* Center content horizontally using mx-auto and constrain width */}
      <div className="mx-auto max-w-md">
        {isLoggedIn ? (
          // Render the LoggedIn component, passing the wallet click handler
          <HomePageLoggedIn onWalletClick={handleWalletClick} />
        ) : (
          // Render the LoggedOut component, passing user data and the register handler
          <HomePageLoggedOut userData={userData} onRegister={handleRegister} />
        )}
      </div>
    </main>
  );
}
