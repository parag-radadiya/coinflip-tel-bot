'use client'

import { useEffect, useState, useCallback } from 'react';
// REMOVE static SDK import: import WebApp from '@twa-dev/sdk';
import type { WebAppUser } from '@twa-dev/types'; // Import type definition
import { DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface WalletData {
  publicKey: string;
  balance: {
    tokenBalance: number;
    solBalance: number;
    usdtBalance: number;
  };
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [refreshing, setRefreshing] = useState(false); // For refresh button spin
  const [isCreating, setIsCreating] = useState(false); // For create button disabling
  const [error, setError] = useState<string | null>(null); // For initialization/fetch errors

  // --- NEW State for SDK and User ID ---
  const [webAppSdk, setWebAppSdk] = useState<any>(null); // Holds the loaded SDK
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null); // Holds user ID

  // Function to copy text to clipboard (depends on SDK for alerts)
  const copyToClipboard = useCallback((text: string | undefined) => {
    if (!text) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          webAppSdk?.showAlert('Copied to clipboard!'); // Use SDK state
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          webAppSdk?.showAlert('Failed to copy.'); // Use SDK state
        });
    } else {
      // Fallback for older browsers/environments without navigator.clipboard
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Prevent scrolling to bottom
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        webAppSdk?.showAlert('Copied to clipboard!'); // Use SDK state
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        webAppSdk?.showAlert('Failed to copy.'); // Use SDK state
      }
    }
  }, [webAppSdk]); // Add webAppSdk dependency

  // Fetch wallet data function (depends on SDK/UserID)
  const fetchWalletData = useCallback(async (isInitialLoad = false) => {
    // Check if SDK loaded and user ID available
    if (!webAppSdk || !telegramUserId) {
        if (!isInitialLoad) { // Don't show error on initial load if SDK isn't ready yet
             setError("Cannot refresh: SDK or User info missing.");
        }
        console.log("Skipping fetchWalletData: SDK or UserID not ready.");
        setIsLoading(false); // Ensure loading stops if called early
        setRefreshing(false);
        return;
    }

    if (!isInitialLoad) setRefreshing(true); // Only show refresh spin on manual trigger
    setError(null); // Clear previous errors on fetch attempt

    try {
      const response = await fetch(`/api/wallet?telegramId=${telegramUserId}`); // Use stored ID
      if (response.ok) {
        const data = await response.json();
        // Ensure balance properties exist and are numbers
        if (!data.balance) data.balance = {};
        data.balance.tokenBalance = typeof data.balance.tokenBalance === 'number' ? data.balance.tokenBalance : (data.balance.token || 0);
        data.balance.solBalance = typeof data.balance.solBalance === 'number' ? data.balance.solBalance : (data.balance.sol || 0);
        data.balance.usdtBalance = typeof data.balance.usdtBalance === 'number' ? data.balance.usdtBalance : (data.balance.usdt || 0);
        setWalletData(data);
      } else if (response.status === 404) {
        console.log("Wallet not found for user.");
        setWalletData(null); // Explicitly set to null if not found
      } else {
        console.error('Failed to fetch wallet data:', response.status);
        setError(`Failed to fetch wallet data (${response.status})`);
        // Don't clear walletData here, maybe show stale data with error? Or set to null?
        setWalletData(null);
        webAppSdk?.showAlert(`Failed to load wallet (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError('Error loading wallet data');
      setWalletData(null); // Clear data on error
      webAppSdk?.showAlert('Error loading wallet data');
    } finally {
      setIsLoading(false); // Ensure main loading stops
      setRefreshing(false); // Ensure refresh spin stops
    }
    // Add webAppSdk and telegramUserId as dependencies
  }, [webAppSdk, telegramUserId]);

  // --- Dynamic SDK Initialization and Initial Data Fetch ---
  useEffect(() => {
    if (typeof window === 'undefined') {
      console.log("Skipping SDK/Wallet fetch on server.");
      setIsLoading(false);
      setError("Cannot initialize outside browser.");
      return;
    }

    setIsLoading(true);
    setError(null);

    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebAppRuntime = SdkModule.default;
        setWebAppSdk(WebAppRuntime);
        WebAppRuntime.ready();

        if (WebAppRuntime.initDataUnsafe?.user) {
          const userId = WebAppRuntime.initDataUnsafe.user.id;
          setTelegramUserId(userId);
          // Trigger initial fetch AFTER setting userId
          // The fetchWalletData function itself now depends on userId being set
          // We rely on a subsequent effect or the fetchWalletData's internal check
        } else {
          console.log("Not running inside Telegram or WebApp data unavailable.");
          setError("Please open within Telegram.");
          setTelegramUserId(null);
          setWalletData(null); // No user, no wallet
          setIsLoading(false); // Stop loading as init failed
        }
      })
      .catch(importError => {
        console.error("Failed to load Telegram SDK:", importError);
        setError("Failed to initialize Telegram features.");
        setIsLoading(false);
      });

  }, []); // Run once on mount to init SDK

  // --- Effect to Fetch Data AFTER SDK/UserID are ready ---
  useEffect(() => {
      if (webAppSdk && telegramUserId) {
          fetchWalletData(true); // Pass true for initial load check
      }
      // If telegramUserId is explicitly null after SDK load (outside TG), stop loading
      else if (webAppSdk && telegramUserId === null && !error) {
          setIsLoading(false);
      }
  }, [webAppSdk, telegramUserId, fetchWalletData, error]); // Depend on SDK, UserID, and the fetch function itself, and error


  // --- Wallet Creation ---
  const createWallet = async () => {
    if (!webAppSdk || !telegramUserId) {
      webAppSdk?.showAlert('Cannot create wallet: User or SDK info missing.');
      return;
    }
    setIsCreating(true); // Show creating state
    setError(null);

    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: telegramUserId }) // Use state variable
      });
       const data = await response.json(); // Try to parse JSON regardless of status

      if (response.ok && data.success) {
        // Fetch data *after* successful creation to update UI
        await fetchWalletData(); // Re-fetch wallet data
        webAppSdk.showAlert('Wallet created successfully!');
      } else {
         console.error("Wallet creation failed:", data);
         setError(`Failed to create wallet: ${data.message || 'Unknown API error'}`);
         webAppSdk.showAlert(`Failed to create wallet: ${data.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      setError('Error creating wallet');
      webAppSdk.showAlert('Error creating wallet');
    } finally {
      setIsCreating(false); // Hide creating state
      // Setting loading false here might hide the wallet data if fetchWalletData hasn't finished
      // It's better handled by fetchWalletData's finally block
    }
  };

  // --- Airdrop Handler ---
  const handleAirdrop = async () => {
    if (!webAppSdk || !telegramUserId) {
        webAppSdk?.showAlert('User or SDK info missing for airdrop.');
        return;
    }
    setRefreshing(true); // Use refreshing state for visual feedback? Or a dedicated airdrop state?

    try {
      const response = await fetch('/api/wallet/airdrop', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: telegramUserId }) // Use state variable
      });

      if (response.ok) {
        const data = await response.json();
        // Update wallet data state directly or refetch
        setWalletData(prev => {
            if (!prev && data.publicKey) return data; // Handle case where wallet was just created by airdrop? Unlikely.
            if (!prev) return null; // Should not happen if airdrop needs existing wallet
            return {
              ...prev, // Keep public key
              balance: data.balance // Update balance object
            };
        });
        webAppSdk.showAlert('Airdrop successful!');
      } else {
        const errorData = await response.json().catch(() => ({message: 'Airdrop request failed'}));
        webAppSdk.showAlert(`Airdrop failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Airdrop failed:', error);
      webAppSdk.showAlert('Airdrop failed. Please try again.');
    } finally {
       setRefreshing(false); // Stop visual feedback
    }
  };


  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
       return (
           <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24 flex items-center justify-center">
               <div className="mx-auto max-w-md">
                   <div className="bg-red-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-4 text-center border border-red-600">
                       <h2 className="text-2xl font-bold text-red-200">Error</h2>
                       <p className="text-red-100">{error}</p>
                       {/* Specific error guidance */}
                       {error === "Please open within Telegram." && <p className="text-sm text-red-200 mt-2">This app requires Telegram features.</p>}
                       <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded">Retry</button>
                   </div>
               </div>
           </div>
       );
   }


  // If no wallet data AFTER loading/SDK init and no error state, show create wallet option
  if (!walletData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
        <div className="mx-auto max-w-md">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-3xl font-bold text-white mb-6">Welcome to Your Wallet</h1>
            <p className="text-gray-300 mb-8">You don&apos;t have a wallet yet. Create one to start using the app.</p>
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={createWallet}
              disabled={isCreating} // Disable while creating
            >
              {isCreating ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Wallet View (Wallet data exists) ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
      <div className="mx-auto max-w-md">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Wallet Overview</h1>
          <button
            onClick={() => fetchWalletData(false)} // Pass false for manual refresh
            disabled={refreshing}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Refresh wallet data"
          >
            <ArrowPathIcon className={`h-5 w-5 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Public Key Card */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-300">Public Key</span>
            <button
              className="text-blue-400 hover:text-blue-300 flex items-center text-sm disabled:opacity-50"
              onClick={() => copyToClipboard(walletData.publicKey)}
              disabled={!walletData.publicKey}
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="mt-2 text-gray-200 font-mono text-sm break-all bg-gray-800 p-2 rounded">
            {walletData.publicKey || 'N/A'}
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Token Balance - Primary */}
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-600">
            <div className="text-sm text-gray-400 mb-1">Token Balance</div>
            <div className="text-3xl font-bold text-blue-400 tracking-wider">
              {walletData.balance.tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
          </div>

          {/* Other Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">SOL Balance</div>
              <div className="text-xl font-bold text-purple-400">
                {walletData.balance.solBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </div>
            </div>
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">USDT Balance</div>
              <div className="text-xl font-bold text-green-400">
                {walletData.balance.usdtBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {/* Conditionally render Airdrop button - check env variable logic might need adjustment depending on build process */}
        {(process.env.NEXT_PUBLIC_ENABLE_AIRDROP === 'true' || process.env.NODE_ENV === 'development') && (
          <button
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all mb-4 disabled:opacity-60"
            onClick={handleAirdrop}
            disabled={refreshing} // Disable if already refreshing/busy
          >
            Airdrop Test Tokens
          </button>
        )}
      </div>
    </div>
  );
}
