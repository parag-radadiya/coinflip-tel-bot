'use client'

import { useEffect, useState, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { DocumentDuplicateIcon, ClipboardDocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import crypto from 'crypto';

interface WalletData {
  publicKey: string;
  balance: {
    tokenBalance: number;
    solBalance: number;
    usdtBalance: number;
  };
}

interface GameResult {
  won: boolean;
  amount: number;
  coinResult: string;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  resultHash?: string;
}

export default function CoinFlipPage() { // Renamed component
  // State variables for the casino page
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [clientSeed, setClientSeed] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);
  const [isBetting, setIsBetting] = useState<boolean>(false);
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string | null>(null);
  const [hashLoading, setHashLoading] = useState<boolean>(false);

  // Generate initial client seed
  useEffect(() => {
    setClientSeed(crypto.randomBytes(16).toString('hex'));
  }, []);

  // Function to fetch the next server seed hash
  const fetchNextHash = useCallback(async () => {
    // Ensure user data and client seed are available
    if (!WebApp.initDataUnsafe.user?.id || !clientSeed) {
        // Optionally set hashLoading to false or handle the state appropriately
        // setHashLoading(false); // Example: Stop loading if prerequisites aren't met
        return; // Exit if user ID or client seed is missing
    }
    setHashLoading(true);
    setNextServerSeedHash(null); // Clear previous hash while loading
    try {
      // Construct the URL safely
      const url = `/api/casino/next-hash?telegramId=${WebApp.initDataUnsafe.user.id}&clientSeed=${encodeURIComponent(clientSeed)}&nonce=${nonce}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNextServerSeedHash(data.serverSeedHash);
      } else {
        console.error('Failed to fetch next hash:', response.status, await response.text());
        setNextServerSeedHash('Error'); // Indicate error
      }
    } catch (error) {
      console.error('Error fetching next hash:', error);
      setNextServerSeedHash('Error');
    } finally {
      setHashLoading(false);
    }
  }, [clientSeed, nonce]); // Dependencies: clientSeed and nonce

  // Fetch hash on initial load and when clientSeed/nonce changes
  useEffect(() => {
    // Only fetch if clientSeed is set (avoids initial fetch with empty seed)
    if (clientSeed) {
        fetchNextHash();
    }
  }, [fetchNextHash, clientSeed]); // Add clientSeed dependency here too

  // Helper function to render verification details with copy button (dark theme adjusted)
  const renderVerificationDetail = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between text-xs break-all py-1">
        <span className="font-medium mr-2 flex-shrink-0 text-gray-400">{label}:</span>
        <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded min-w-0">
            <span className="truncate flex-1 font-mono text-gray-300" title={value}>{value}</span>
            <button
                onClick={() => copyToClipboard(value)}
                className="p-1 hover:bg-gray-600 rounded flex-shrink-0"
                title={`Copy ${label}`}
            >
                <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
            </button>
        </div>
      </div>
    );
  };

  // Function to copy text to clipboard
  const copyToClipboard = useCallback((text: string | undefined) => {
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => WebApp.showAlert('Copied to clipboard!'))
        .catch(err => {
          console.error('Failed to copy text: ', err);
          WebApp.showAlert('Failed to copy.');
        });
    } else if (text) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            WebApp.showAlert('Copied to clipboard!');
        } catch (err) {
            console.error('Fallback copy failed: ', err);
            WebApp.showAlert('Failed to copy.');
        }
    }
  }, []);

  // Handle Bet Submission
  const handleGame = async (choice: string) => {
    // Ensure walletData and balance are loaded
     if (!walletData || typeof walletData.balance.tokenBalance !== 'number') {
        WebApp.showAlert('Wallet data not loaded yet.');
        return;
    }
    if (!betAmount || betAmount <= 0 || betAmount > walletData.balance.tokenBalance) {
      WebApp.showAlert('Invalid bet amount or insufficient balance.');
      return;
    }
    if (!clientSeed) {
      WebApp.showAlert('Client seed is missing.');
      return;
    }
    // Check hash status more robustly
    if (hashLoading || !nextServerSeedHash || nextServerSeedHash === 'Error') {
        WebApp.showAlert('Provably fair hash not ready. Please wait or refresh.');
        return;
    }

    setIsBetting(true);
    setGameResult(null);

    try {
      const response = await fetch('/api/casino/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: WebApp.initDataUnsafe.user?.id,
          betAmount,
          choice,
          clientSeed,
          nonce
        })
      });

      const resultData = await response.json();

      if (response.ok) {
        setGameResult({
          won: resultData.won,
          amount: betAmount,
          coinResult: resultData.coinResult,
          serverSeed: resultData.serverSeed,
          serverSeedHash: resultData.serverSeedHash, // This is the hash for the *completed* bet
          clientSeed: resultData.clientSeed,
          nonce: resultData.nonce,
          resultHash: resultData.resultHash
        });
        // Optimistic update
        setWalletData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                balance: {
                    ...prev.balance,
                    tokenBalance: resultData.newBalance
                }
            };
        });
        setNonce(prevNonce => prevNonce + 1); // Increment nonce for the *next* bet
        // Note: fetchNextHash will be triggered by the useEffect watching nonce
      } else {
         WebApp.showAlert(`Bet failed: ${resultData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bet error:', error);
       WebApp.showAlert('Failed to process bet. Please try again.');
    } finally {
      setIsBetting(false);
    }
  };

  // Fetch Initial Wallet Data
  useEffect(() => {
    const fetchData = async () => {
      if (WebApp.initDataUnsafe.user?.id) { // Check for user ID specifically
        const { id } = WebApp.initDataUnsafe.user;
        try {
          const response = await fetch(`/api/wallet?telegramId=${id}`);
          if (response.ok) {
            const data = await response.json();
            // Ensure tokenBalance exists and is a number, default if not
             if (!data.balance || typeof data.balance.tokenBalance !== 'number') {
                 console.warn("tokenBalance missing or not a number in fetched data, defaulting to 0");
                 // Ensure balance object exists before assigning
                 if (!data.balance) data.balance = {};
                 data.balance.tokenBalance = data.balance.token || 0; // Fallback to 'token' if needed
             }
            setWalletData(data);
          } else {
            console.error('Failed to fetch wallet data:', response.status);
            WebApp.showAlert(`Could not load wallet data (${response.status})`);
          }
        } catch (error) {
          console.error('Error fetching wallet data:', error);
          WebApp.showAlert('Error loading wallet data.');
        } finally {
          setLoading(false);
        }
      } else {
        console.warn('Telegram user data not available on initial load.');
        setLoading(false);
        // Avoid showing alert immediately, maybe wait or show a message
        // WebApp.showAlert('Telegram user data not available.');
      }
    };

    // Call fetchData after ensuring TWA SDK is ready
    WebApp.ready();
    fetchData();

  }, []); // Empty dependency array means this runs once on mount

  // Loading State UI
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
      </div>
    );
  }

  // Simple Coin Flip Visual Component
  const CoinVisual = ({ result }: { result: string | null }) => {
    const baseClasses = "w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl md:text-5xl font-bold shadow-xl transition-colors duration-300";
    if (!result) {
      return <div className={`${baseClasses} bg-gray-500 text-gray-300 animate-pulse`}>?</div>;
    }
    if (result === 'heads') {
      return <div className={`${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900`}>H</div>; // Gold-ish
    }
    return <div className={`${baseClasses} bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800`}>T</div>; // Silver-ish
  };

  // Main Component Render
  return (
    // Added pb-24 (padding-bottom: 6rem) to account for the fixed navbar (h-16 = 4rem) + extra space
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 font-sans pb-24">
      <div className="mx-auto max-w-md"> {/* Narrower max-width for mobile focus */}

        {/* Balance Display */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 text-center border border-gray-600">
          <div className="text-sm text-gray-400 mb-1">Token Balance</div>
          <div className="text-3xl font-bold text-yellow-400 tracking-wider">
            {/* Ensure walletData and balance exist before accessing tokenBalance */}
            {walletData?.balance ? walletData.balance.tokenBalance.toLocaleString() : '...'}
          </div>
          {/* TODO: Add other balances if needed */}
        </div>

        {/* Main Game Area */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-5 md:p-6 space-y-6 border border-gray-600">
          <h2 className="text-2xl font-semibold text-center text-white mb-2">Coin Flip</h2>

          {/* Result Display Area */}
          <div className="flex flex-col items-center justify-center min-h-[180px] md:min-h-[200px] space-y-3 bg-gray-800/40 rounded-lg p-4 border border-gray-600">
            {isBetting ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                <p className="text-gray-400 text-sm">Flipping...</p>
              </>
            ) : gameResult ? (
              <div className="text-center space-y-2 animate-fade-in"> {/* Added fade-in animation */}
                 <CoinVisual result={gameResult.coinResult} />
                 <p className={`text-xl font-bold ${gameResult.won ? 'text-green-400' : 'text-red-400'}`}>
                   {gameResult.won ? `+${gameResult.amount.toLocaleString()}` : `-${gameResult.amount.toLocaleString()}`} Tokens!
                 </p>
                 <p className="text-sm text-gray-300">
                   Landed on <span className="font-semibold capitalize">{gameResult.coinResult}</span>
                 </p>
              </div>
            ) : (
               <CoinVisual result={null} />
            )}
          </div>


          {/* Next Server Seed Hash Display */}
          <div className="bg-gray-700 p-3 rounded-lg mb-5 border border-gray-600">
              <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-400 text-xs">Next Bet Server Hash</span>
                  <span className="text-gray-500 text-xs">Nonce: {nonce}</span>
              </div>
              {hashLoading ? (
                  <div className="h-5 bg-gray-600 rounded animate-pulse w-3/4"></div>
              ) : (
                  <div className="flex items-center space-x-2">
                     <span className="text-gray-200 break-all font-mono text-xs flex-1 truncate" title={nextServerSeedHash || 'N/A'}>{nextServerSeedHash || 'N/A'}</span>
                     <button
                         onClick={() => copyToClipboard(nextServerSeedHash || undefined)}
                         className="p-1 hover:bg-gray-600 rounded flex-shrink-0"
                         title="Copy Next Hash"
                         disabled={!nextServerSeedHash || nextServerSeedHash === 'Error'}
                     >
                         <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                     </button>
                  </div>
              )}
          </div>

          {/* Bet Controls */}
          <div className="space-y-5">
             <div>
                <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-2">Bet Amount</label>
                <input
                    id="betAmount"
                    type="number"
                    min="1"
                    // Ensure walletData and balance exist before accessing tokenBalance
                    max={walletData?.balance?.tokenBalance ?? 1}
                    placeholder="Enter bet amount"
                    className="w-full p-3 rounded-lg border border-gray-500 bg-gray-800 text-white text-center text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-600 disabled:opacity-70 appearance-none" // Hide number spinners
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))} // Ensure bet is at least 1
                    disabled={isBetting || !walletData}
                />
                {/* TODO: Add quick bet buttons (e.g., /2, x2, Max) here if desired */}
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button
                  className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 rounded-lg font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400"
                  onClick={() => handleGame('heads')}
                  disabled={isBetting || !walletData || betAmount <= 0 || !nextServerSeedHash || hashLoading || nextServerSeedHash === 'Error'}
                >
                  HEADS
                </button>
                <button
                  className="p-4 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 rounded-lg font-bold text-lg hover:from-gray-200 hover:to-gray-400 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400"
                  onClick={() => handleGame('tails')}
                  disabled={isBetting || !walletData || betAmount <= 0 || !nextServerSeedHash || hashLoading || nextServerSeedHash === 'Error'}
                >
                  TAILS
                </button>
              </div>
          </div>

          {/* Provably Fair Section - Open by default */}
          <details open className="bg-gray-800/60 rounded-lg p-4 text-xs border border-gray-600 group">
             <summary className="font-semibold text-gray-300 cursor-pointer hover:text-white list-none flex justify-between items-center">
                <span>Provably Fair Details</span>
                <span className="text-gray-500 group-open:rotate-180 transition-transform duration-200">▼</span>
             </summary>
             <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                {/* Next Server Seed Hash Display - Moved above Bet Controls */}
                // Client Seed Section
                <div className="space-y-2">
                    <label htmlFor="clientSeedInput" className="block text-xs font-medium text-gray-400">Client Seed</label>
                    <div className="flex items-center space-x-2">
                        <input
                            id="clientSeedInput"
                            type="text"
                            value={clientSeed}
                            onChange={(e) => setClientSeed(e.target.value)}
                            className="flex-grow p-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-200 focus:ring-1 focus:ring-yellow-500 text-xs font-mono"
                            placeholder="Enter or generate a client seed"
                            disabled={isBetting}
                        />
                        <button
                            onClick={() => setClientSeed(crypto.randomBytes(16).toString('hex'))}
                            className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0"
                            title="Generate New Client Seed"
                            disabled={isBetting}
                        >
                            <ArrowPathIcon className="h-4 w-4 text-gray-300" />
                        </button>
                        <button
                            onClick={() => copyToClipboard(clientSeed)}
                            className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0"
                            title="Copy Client Seed"
                            disabled={isBetting}
                        >
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
                        </button>
                    </div>
                </div>

                // Last Game Verification Details
                {gameResult && !isBetting && (
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                     <h4 className="font-semibold text-sm mb-1 text-gray-300">Last Bet Verification (Nonce: {gameResult.nonce})</h4>
                     {renderVerificationDetail("Server Seed Hash (Committed)", gameResult.serverSeedHash)}
                     {renderVerificationDetail("Client Seed", gameResult.clientSeed)}
                     {renderVerificationDetail("Nonce", gameResult.nonce?.toString())}
                     {renderVerificationDetail("Server Seed (Revealed)", gameResult.serverSeed)}
                     {renderVerificationDetail("Result Hash (HMAC-SHA256)", gameResult.resultHash)}
                     <p className="text-xs text-gray-500 mt-2">Verify the result using an external calculator or script.</p>
                  </div>
                )}
             </div>
          </details>
        </div>
      </div>
    </div>
  );
}