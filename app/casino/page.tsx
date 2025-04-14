'use client';

import { useState, useEffect, useCallback } from 'react';
import CasinoWalletRequired from '@/app/components/CasinoWalletRequired'; // Import the wallet required component
import GameCard from '@/app/components/GameCard'; // Import the game card component

// Define the structure for user data expected from the SDK
interface UserData {
  id: number;
  // Add other user properties if needed later
}

/**
 * Casino Page component.
 * Displays available casino games. Checks if the user has a wallet,
 * prompts for creation if needed, and handles wallet creation logic.
 */
export default function CasinoPage() {
  // State for the Telegram Web App SDK instance
  const [webAppSdk, setWebAppSdk] = useState<any>(null);
  // State for the user's Telegram ID
  const [userId, setUserId] = useState<number | null>(null);
  // State to track wallet existence (null: checking, true: exists, false: doesn't exist)
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  // General loading state for initial checks
  const [isLoading, setIsLoading] = useState(true);
  // Specific loading state for the wallet creation process
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  // State for displaying messages/errors to the user
  const [message, setMessage] = useState<string | null>(null);

  // Effect hook to initialize SDK and check wallet status
  useEffect(() => {
    // Prevent SDK initialization during server-side rendering
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setMessage('Cannot initialize outside Telegram environment.');
      return;
    }

    setIsLoading(true);
    // Dynamically import the SDK on the client-side
    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebApp = SdkModule.default;
        setWebAppSdk(WebApp); // Store SDK instance
        WebApp.ready(); // Signal readiness to Telegram

        // Check for user data in the SDK
        if (WebApp.initDataUnsafe?.user) {
          const currentUser = WebApp.initDataUnsafe.user as UserData;
          setUserId(currentUser.id); // Store user ID

          // Check wallet status with the backend
          fetch(`/api/wallet?telegramId=${currentUser.id}`)
            .then(async (res) => {
              if (!res.ok) {
                // Handle non-successful responses (e.g., 404, 500)
                const errorText = await res.text();
                throw new Error(`Wallet check failed: ${res.status} ${errorText || ''}`);
              }
              // If the response is OK (status 200-299), it means the wallet exists.
              // We don't need to parse the JSON body here just to check existence.
              setHasWallet(true); // Wallet exists
              setIsLoading(false); // Finished loading
            })
            // No need for the .then(data => ...) block anymore for this check
            .catch(error => {
              // Errors (including 404 Not Found) mean the wallet doesn't exist or there was another issue.
              console.error('Error checking wallet status:', error);
              setMessage(`Error checking wallet: ${error.message}`);
              setHasWallet(false); // Assume no wallet on error
              setIsLoading(false); // Finished loading (with error)
            });
        } else {
          // No user data found in SDK
          setMessage('Telegram user data not found. Please open in Telegram.');
          setIsLoading(false); // Finished loading (no user)
        }
      })
      .catch(error => {
        console.error('Error loading Telegram WebApp SDK:', error);
        setMessage('Failed to load Telegram features.');
        setIsLoading(false); // Finished loading (SDK error)
      });
  }, []); // Run once on mount

  // Handler function to create a wallet, wrapped in useCallback
  const handleCreateWallet = useCallback(async () => {
    if (!userId) {
      setMessage('User ID not available for wallet creation.');
      return;
    }
    if (!webAppSdk) {
        setMessage('Telegram SDK not initialized.');
        return;
    }

    setIsCreatingWallet(true); // Set loading state for creation process
    setMessage(null); // Clear previous messages
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: userId }) // Send user ID to backend
      });

      if (response.ok) {
        setHasWallet(true); // Wallet created successfully
        webAppSdk.showAlert('Wallet created successfully!'); // Notify user
      } else {
        // Handle wallet creation failure
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('Wallet creation failed:', response.status, errorData);
        setMessage(`Failed to create wallet: ${errorData.message || 'Server error'}`);
        webAppSdk.showAlert(`Failed to create wallet: ${errorData.message || 'Server error'}`);
      }
    } catch (error: any) {
      console.error('Network or other error during wallet creation:', error);
      setMessage(`An error occurred: ${error.message}`);
      webAppSdk.showAlert('An error occurred during wallet creation.');
    } finally {
      setIsCreatingWallet(false); // Reset creation loading state
    }
  }, [userId, webAppSdk]); // Dependencies for the callback

  // Render loading state while checking SDK/wallet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 flex items-center justify-center">
        <p className="text-xl animate-pulse">Loading Casino...</p>
      </div>
    );
  }

  // Render message if user ID is missing or other critical errors occurred
  if (!userId || message) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 flex items-center justify-center">
        <p className="text-center text-red-400">{message || 'User information is missing.'}</p>
      </div>
    );
  }

  // If wallet check is done and user doesn't have a wallet, show the creation prompt
  if (hasWallet === false) {
    return (
      <CasinoWalletRequired
        onCreateWallet={handleCreateWallet}
        isLoading={isCreatingWallet}
      />
    );
  }

  // Main content: Display available casino games if wallet exists
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24 font-sans">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8 text-yellow-400">🎰 Casino Games</h1>

        {/* Grid layout for game cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* Use the GameCard component for Coin Flip */}
          <GameCard
            href="/casino/coinflip"
            title="🪙 Coin Flip"
            description="Flip a coin, double or nothing!"
          />

          {/* Add more GameCard components here for other games */}
          {/* Example placeholder:
          <GameCard
            href="/casino/dice"
            title="🎲 Dice Roll"
            description="Roll the dice and test your luck."
          />
          */}
           <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-dashed border-gray-600 flex items-center justify-center h-full">
             <p className="text-gray-500 text-sm">More games coming soon!</p>
           </div>
        </div>
      </div>
    </div>
  );
}
