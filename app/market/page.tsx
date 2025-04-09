'use client'

import { useState, useEffect, useCallback } from 'react';
// REMOVE static SDK import: import WebApp from '@twa-dev/sdk';
import type { WebAppUser } from '@twa-dev/types'; // Import type definition

export default function MarketPage() {
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [mintTokenAmount, setMintTokenAmount] = useState<string>('');
  const [mintUsdtAmount, setMintUsdtAmount] = useState<string>('');

  // --- NEW State for SDK, User ID, Wallet, Loading, Errors ---
  const [webAppSdk, setWebAppSdk] = useState<any>(null); // Holds the loaded SDK
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null); // Holds user ID
  const [isLoading, setIsLoading] = useState<boolean>(true); // Combined loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For button disabling
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // Initialization error

  // --- Dynamic SDK Initialization and Wallet Check ---
  useEffect(() => {
    if (typeof window === 'undefined') {
      console.log("Skipping SDK/Wallet fetch on server.");
      setIsLoading(false);
      setError("Cannot initialize outside browser.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebAppRuntime = SdkModule.default;
        setWebAppSdk(WebAppRuntime);
        WebAppRuntime.ready();

        if (WebAppRuntime.initDataUnsafe?.user) {
          const userId = WebAppRuntime.initDataUnsafe.user.id;
          setTelegramUserId(userId);

          // Check if user has wallet
          fetch(`/api/wallet?telegramId=${userId}`)
            .then(async res => {
              if (!res.ok) {
                  // Try to get error message from response
                  const errorBody = await res.text().catch(() => 'Failed to parse error');
                  console.error(`Wallet check failed (${res.status}):`, errorBody);
                  throw new Error(`Wallet check failed (${res.status})`);
              }
              return res.json();
            })
            .then(data => {
                // Check for a property indicating success or existence, adjust based on your API
                const walletExists = !!data?.publicKey || data?.success === true;
                setHasWallet(walletExists);
            })
            .catch((err) => {
                console.error('Error checking wallet:', err);
                setError('Could not check wallet status.');
                setHasWallet(false); // Assume no wallet on error
            })
            .finally(() => {
                setIsLoading(false); // Finished checking wallet
            });

        } else {
          console.log("Not running inside Telegram or WebApp data unavailable.");
          setError("Please open within Telegram.");
          setTelegramUserId(null);
          setHasWallet(false);
          setIsLoading(false);
        }
      })
      .catch(importError => {
        console.error("Failed to load Telegram SDK:", importError);
        setError("Failed to initialize Telegram features.");
        setIsLoading(false);
      });

  }, []); // Run once on mount

  // --- Wallet Creation ---
  const createWallet = async () => {
    if (!webAppSdk || !telegramUserId) {
      setMessage({ text: 'Cannot create wallet: User or SDK info missing.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: telegramUserId }) // Use state variable
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHasWallet(true);
        setMessage({ text: 'Wallet created successfully!', type: 'success'});
      } else {
         setMessage({ text: `Wallet creation failed: ${data.message || 'Unknown error'}`, type: 'error'});
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      setMessage({ text: 'An error occurred while creating the wallet.', type: 'error'});
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Common Handler for Market Actions ---
  const handleMarketAction = async (action: 'buy' | 'sell', amountStr: string) => {
      if (!webAppSdk || !telegramUserId) {
          setMessage({ text: `Cannot perform action: User or SDK info missing.`, type: 'error' });
          return;
      }
      if (!hasWallet) {
          setMessage({ text: `Cannot perform action: Wallet required.`, type: 'error' });
          return;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
          setMessage({ text: `Invalid ${action} amount.`, type: 'error' });
          return;
      }

      setIsSubmitting(true);
      setMessage(null);

      try {
          const response = await fetch('/api/market', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramId: telegramUserId, amount, action }),
          });
          const data = await response.json();

          setMessage({ text: data.message || `${action.charAt(0).toUpperCase() + action.slice(1)} request processed.`, type: response.ok ? 'success' : 'error' });
          if (response.ok && action === 'buy') setBuyAmount('');
          if (response.ok && action === 'sell') setSellAmount('');

      } catch (error) {
          console.error(`Error ${action}ing tokens:`, error);
          setMessage({ text: `Error ${action}ing tokens. Please try again.`, type: 'error' });
      } finally {
          setIsSubmitting(false);
      }
  };


  // --- Common Handler for Minting Actions ---
  const handleMintAction = async (tokenType: 'token' | 'usdt', amountStr: string) => {
      if (!webAppSdk || !telegramUserId) {
          setMessage({ text: `Cannot mint: User or SDK info missing.`, type: 'error' });
          return;
      }
      if (!hasWallet) {
          setMessage({ text: `Cannot mint: Wallet required.`, type: 'error' });
          return;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
          setMessage({ text: 'Invalid mint amount.', type: 'error' });
          return;
      }

      setIsSubmitting(true);
      setMessage(null);

      try {
          const response = await fetch('/api/wallet/mint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramId: telegramUserId, amount, tokenType }),
          });
          const data = await response.json();

          setMessage({ text: data.message || `Minting request processed.`, type: response.ok && data.success ? 'success' : 'error' });

          if (response.ok && data.success) {
              if (tokenType === 'token') setMintTokenAmount('');
              if (tokenType === 'usdt') setMintUsdtAmount('');
          }
      } catch (error) {
          console.error(`Error minting ${tokenType.toUpperCase()}:`, error);
          setMessage({ text: `Error minting ${tokenType.toUpperCase()}. Please try again.`, type: 'error' });
      } finally {
          setIsSubmitting(false);
      }
  };


  // --- Render Logic ---

  if (isLoading) {
      return (
          <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4 md:p-6 pb-24 flex items-center justify-center">
              <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-gray-300">Initializing Market...</p>
              </div>
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
                      <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded">Retry</button>
                  </div>
              </div>
          </div>
      );
  }

  if (!hasWallet) {
      return (
          <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
              <div className="mx-auto max-w-md">
                  <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
                      <h1 className="text-3xl font-bold text-white mb-6">Wallet Required</h1>
                      <p className="text-gray-300 mb-8">You need a wallet to access the market features.</p>
                      {message && (
                         <div className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/70 text-green-200 border border-green-700' : 'bg-red-900/70 text-red-200 border border-red-700'}`}>
                            {message.text}
                         </div>
                      )}
                      <button
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={createWallet}
                          disabled={isSubmitting}
                      >
                          {isSubmitting ? 'Creating...' : 'Create Wallet'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Main Market View (Wallet exists) ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-8 border border-gray-600">
          <h1 className="text-3xl font-bold text-white text-center mb-4">Market</h1>

          {message && (
            <div className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/70 text-green-200 border border-green-700' : 'bg-red-900/70 text-red-200 border border-red-700'}`}>
              {message.text}
            </div>
          )}

          {/* Buy Tokens Section */}
          <div className="space-y-3 p-4 bg-gray-800/40 rounded-lg border border-gray-600">
            <h2 className="text-xl font-semibold text-white">Buy Tokens</h2>
            <p className="text-xs text-gray-400">Spend USDT to acquire game tokens.</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="number"
                placeholder="Amount of USDT"
                className="bg-gray-600/50 border border-gray-500 text-white rounded-md p-2 flex-grow focus:ring-1 focus:ring-green-500"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                onClick={() => handleMarketAction('buy', buyAmount)}
                disabled={isSubmitting || !buyAmount}
              >
                {isSubmitting ? 'Processing...' : 'Buy Tokens'}
              </button>
            </div>
          </div>

           {/* Sell Tokens Section */}
           <div className="space-y-3 p-4 bg-gray-800/40 rounded-lg border border-gray-600">
             <h2 className="text-xl font-semibold text-white">Sell Tokens</h2>
             <p className="text-xs text-gray-400">Sell game tokens to receive USDT.</p>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
               <input
                 type="number"
                 placeholder="Amount of Tokens"
                 className="bg-gray-600/50 border border-gray-500 text-white rounded-md p-2 flex-grow focus:ring-1 focus:ring-red-500"
                 value={sellAmount}
                 onChange={(e) => setSellAmount(e.target.value)}
                 disabled={isSubmitting}
               />
               <button
                 className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                 onClick={() => handleMarketAction('sell', sellAmount)}
                 disabled={isSubmitting || !sellAmount}
               >
                 {isSubmitting ? 'Processing...' : 'Sell Tokens'}
               </button>
             </div>
           </div>

           {/* Mint Tokens Section */}
           <div className="space-y-3 p-4 bg-gray-800/40 rounded-lg border border-gray-600">
             <h2 className="text-xl font-semibold text-white">Mint Tokens (Dev/Test)</h2>
             <p className="text-xs text-gray-400">Directly mint game tokens to your wallet.</p>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
               <input
                 type="number"
                 placeholder="Amount of Tokens"
                 className="bg-gray-600/50 border border-gray-500 text-white rounded-md p-2 flex-grow focus:ring-1 focus:ring-blue-500"
                 value={mintTokenAmount}
                 onChange={(e) => setMintTokenAmount(e.target.value)}
                 disabled={isSubmitting}
               />
               <button
                 className="bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                 onClick={() => handleMintAction('token', mintTokenAmount)}
                 disabled={isSubmitting || !mintTokenAmount}
               >
                 {isSubmitting ? 'Minting...' : 'Mint Tokens'}
               </button>
             </div>
           </div>

           {/* Mint USDT Section */}
           <div className="space-y-3 p-4 bg-gray-800/40 rounded-lg border border-gray-600">
             <h2 className="text-xl font-semibold text-white">Mint USDT (Dev/Test)</h2>
              <p className="text-xs text-gray-400">Directly mint USDT to your wallet.</p>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
               <input
                 type="number"
                 placeholder="Amount of USDT"
                 className="bg-gray-600/50 border border-gray-500 text-white rounded-md p-2 flex-grow focus:ring-1 focus:ring-purple-500"
                 value={mintUsdtAmount}
                 onChange={(e) => setMintUsdtAmount(e.target.value)}
                 disabled={isSubmitting}
               />
               <button
                 className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                 onClick={() => handleMintAction('usdt', mintUsdtAmount)}
                 disabled={isSubmitting || !mintUsdtAmount}
               >
                 {isSubmitting ? 'Minting...' : 'Mint USDT'}
               </button>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
}
