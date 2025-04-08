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
  coinResult: 'heads' | 'tails';
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  resultHash?: string;
}

export default function CoinFlipPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [clientSeed, setClientSeed] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);
  const [isBetting, setIsBetting] = useState<boolean>(false); // Tracks API call status
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string | null>(null);
  const [hashLoading, setHashLoading] = useState<boolean>(false);
  const [isFlipping, setIsFlipping] = useState<boolean>(false); // Tracks if *any* animation is running
  const [animationClass, setAnimationClass] = useState<string>(''); // Holds current animation class
  const [userChoice, setUserChoice] = useState<'heads' | 'tails' | null>(null);
  const [showResultText, setShowResultText] = useState<boolean>(false); // Controls when to show result text

  // Generate initial client seed
  useEffect(() => {
    setClientSeed(crypto.randomBytes(16).toString('hex'));
  }, []);

  // Fetch next server seed hash
  const fetchNextHash = useCallback(async () => {
    if (!WebApp.initDataUnsafe.user?.id || !clientSeed) return;
    setHashLoading(true);
    setNextServerSeedHash(null);
    try {
      const url = `/api/casino/next-hash?telegramId=${WebApp.initDataUnsafe.user.id}&clientSeed=${encodeURIComponent(clientSeed)}&nonce=${nonce}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNextServerSeedHash(data.serverSeedHash);
      } else {
        console.error('Failed to fetch next hash:', response.status, await response.text());
        setNextServerSeedHash('Error');
      }
    } catch (error) {
      console.error('Error fetching next hash:', error);
      setNextServerSeedHash('Error');
    } finally {
      setHashLoading(false);
    }
  }, [clientSeed, nonce]);

  // Fetch hash on load and changes
  useEffect(() => {
    if (clientSeed) fetchNextHash();
  }, [fetchNextHash, clientSeed]);

  // Render verification details
  const renderVerificationDetail = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between text-xs break-all py-1">
        <span className="font-medium mr-2 flex-shrink-0 text-gray-400">{label}:</span>
        <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded min-w-0">
          <span className="truncate flex-1 font-mono text-gray-300" title={value}>{value}</span>
          <button onClick={() => copyToClipboard(value)} className="p-1 hover:bg-gray-600 rounded flex-shrink-0" title={`Copy ${label}`}>
            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => WebApp.showAlert('Copied!'))
      .catch(err => {
        console.error('Copy failed: ', err);
        WebApp.showAlert('Copy failed.');
      });
  }, []);

  // Handle Bet Submission
  const handleGame = async (choice: 'heads' | 'tails') => {
    if (isBetting) return; // Prevent double clicks
    if (!walletData || typeof walletData.balance.tokenBalance !== 'number') {
      WebApp.showAlert('Wallet data not loaded yet.'); return;
    }
    if (!betAmount || betAmount <= 0 || betAmount > walletData.balance.tokenBalance) {
      WebApp.showAlert('Invalid bet amount or insufficient balance.'); return;
    }
    if (!clientSeed) { WebApp.showAlert('Client seed is missing.'); return; }
    if (hashLoading || !nextServerSeedHash || nextServerSeedHash === 'Error') {
      WebApp.showAlert('Provably fair hash not ready. Please wait or refresh.'); return;
    }

    // --- Start Bet ---
    setIsBetting(true);
    setGameResult(null);
    setShowResultText(false);
    setUserChoice(choice); // Store user's bet choice
    setAnimationClass('animate-spin-continuous'); // Start continuous spinning animation
    setIsFlipping(true); // Animation is now running

    try {
       // --- Simulate API delay for testing ---
       // await new Promise(resolve => setTimeout(resolve, 1500));
       // --- End Simulation ---

      const response = await fetch('/api/casino/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: WebApp.initDataUnsafe.user?.id, betAmount, choice, clientSeed, nonce
        })
      });

      const resultData = await response.json();

      // --- Stop continuous spinning animation ---
      setIsBetting(false); // API call is complete

      if (response.ok) {
        // --- Set Result and final animation ---
        const validatedResult = (resultData.coinResult === 'heads' || resultData.coinResult === 'tails')
                                ? resultData.coinResult
                                : 'tails'; // Default fallback

        // Set the appropriate animation class based on the result
        setAnimationClass(`animate-flip-${validatedResult}`); // This will end with the correct side up

        setGameResult({
          won: resultData.won, amount: betAmount, coinResult: validatedResult,
          serverSeed: resultData.serverSeed, serverSeedHash: resultData.serverSeedHash,
          clientSeed: resultData.clientSeed, nonce: resultData.nonce, resultHash: resultData.resultHash
        });

        // Wait for animation to complete before showing result text
        setTimeout(() => {
          setShowResultText(true);
          setIsFlipping(false); // Animation is now complete
        }, 1000); // Match the animation duration in CSS

        setWalletData(prev => {
            if (!prev) return null;
            return { ...prev, balance: { ...prev.balance, tokenBalance: resultData.newBalance }};
        });
        setNonce(prevNonce => prevNonce + 1); // Triggers fetchNextHash via useEffect

      } else {
         setGameResult(null);
         setShowResultText(false);
         setAnimationClass(''); // Clear animation on error
         setIsFlipping(false); // Stop animation
         WebApp.showAlert(`Bet failed: ${resultData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bet error:', error);
      setIsBetting(false); // Ensure betting stops
      setGameResult(null);
      setShowResultText(false);
      setAnimationClass(''); // Clear animation on error
      setIsFlipping(false); // Stop animation
      WebApp.showAlert('Failed to process bet. Please try again.');
    }
  };

  // Fetch Initial Wallet Data
  useEffect(() => {
    const fetchData = async () => {
      if (WebApp.initDataUnsafe.user?.id) {
        const { id } = WebApp.initDataUnsafe.user;
        try {
          const response = await fetch(`/api/wallet?telegramId=${id}`);
          if (response.ok) {
            const data = await response.json();
             if (!data.balance || typeof data.balance.tokenBalance !== 'number') {
                 if (!data.balance) data.balance = {};
                 data.balance.tokenBalance = data.balance.token || 0;
             }
            setWalletData(data);
          } else { WebApp.showAlert(`Could not load wallet data (${response.status})`); }
        } catch (error) { WebApp.showAlert('Error loading wallet data.'); }
        finally { setLoading(false); }
      } else { setLoading(false); }
    };
    WebApp.ready();
    fetchData();
  }, []);

  // Loading UI
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div></div>;
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 font-sans pb-24">
      <div className="mx-auto max-w-md">
        {/* Balance */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 text-center border border-gray-600">
          <div className="text-sm text-gray-400 mb-1">Token Balance</div>
          <div className="text-3xl font-bold text-yellow-400 tracking-wider">
            {walletData?.balance ? walletData.balance.tokenBalance.toLocaleString() : '...'}
          </div>
        </div>

        {/* Game Area */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-5 md:p-6 space-y-6 border border-gray-600">
          <h2 className="text-2xl font-semibold text-center text-white mb-2">Coin Flip</h2>

          {/* Coin Animation Area */}
          <div className="flex flex-col items-center justify-center min-h-[200px] md:min-h-[220px] space-y-4 bg-gray-800/40 rounded-lg p-4 border border-gray-600">
            <div className="coin-container w-28 h-28 md:w-36 md:h-36">
              <div
                className={`coin ${animationClass}`}
                key={nonce} // Force re-render for animation restart
              >
                <div className="coin-face coin-front bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 text-5xl md:text-6xl flex items-center justify-center">H</div>
                <div className="coin-face coin-back bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 text-5xl md:text-6xl flex items-center justify-center">T</div>
              </div>
            </div>

            {/* Result Text (shown after final flip animation finishes) */}
            {/* Use opacity transition for smoother appearance */}
            <div className={`text-center space-y-1 h-14 transition-opacity duration-300 ${showResultText && gameResult ? 'opacity-100' : 'opacity-0'}`}>
              {gameResult && ( // Render content only when result is available
                <>
                  <p className={`text-xl font-bold ${gameResult.won ? 'text-green-400' : 'text-red-400'}`}>
                    {gameResult.won ? `+${gameResult.amount.toLocaleString()}` : `-${gameResult.amount.toLocaleString()}`} Tokens!
                  </p>
                  <p className="text-sm text-gray-300">
                    Landed on <span className="font-semibold capitalize">{gameResult.coinResult}</span>
                  </p>
                </>
              )}
            </div>
             {/* Placeholder Text (shown when idle) */}
             {!isFlipping && !gameResult && (
                 <p className="text-gray-400 text-sm h-14 flex items-center justify-center">
                     Place your bet!
                 </p>
             )}
             {/* Removed "Flipping..." text */}
          </div>

          {/* Next Hash Display */}
          <div className="bg-gray-700 p-3 rounded-lg mb-5 border border-gray-600">
              <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-400 text-xs">Next Bet Server Hash</span>
                  <span className="text-gray-500 text-xs">Nonce: {nonce}</span>
              </div>
              {hashLoading ? ( <div className="h-5 bg-gray-600 rounded animate-pulse w-3/4"></div> ) : (
                  <div className="flex items-center space-x-2">
                     <span className="text-gray-200 break-all font-mono text-xs flex-1 truncate" title={nextServerSeedHash || 'N/A'}>{nextServerSeedHash || 'N/A'}</span>
                     <button onClick={() => copyToClipboard(nextServerSeedHash || undefined)} className="p-1 hover:bg-gray-600 rounded flex-shrink-0" title="Copy Next Hash" disabled={!nextServerSeedHash || nextServerSeedHash === 'Error'}>
                         <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                     </button>
                  </div>
              )}
          </div>

          {/* Bet Controls */}
          <div className="space-y-5">
             <div>
                <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-2">Bet Amount</label>
                <input id="betAmount" type="number" min="1" max={walletData?.balance?.tokenBalance ?? 1} placeholder="Enter bet amount"
                    className="w-full p-3 rounded-lg border border-gray-500 bg-gray-800 text-white text-center text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-600 disabled:opacity-70 appearance-none"
                    value={betAmount} onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                    disabled={isBetting || isFlipping || !walletData} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleGame('heads')} disabled={isBetting || isFlipping || !walletData || betAmount <= 0 || !nextServerSeedHash || hashLoading || nextServerSeedHash === 'Error'}
                  className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 rounded-lg font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400">
                  HEADS
                </button>
                <button onClick={() => handleGame('tails')} disabled={isBetting || isFlipping || !walletData || betAmount <= 0 || !nextServerSeedHash || hashLoading || nextServerSeedHash === 'Error'}
                  className="p-4 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 rounded-lg font-bold text-lg hover:from-gray-200 hover:to-gray-400 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400">
                  TAILS
                </button>
              </div>
          </div>

          {/* Provably Fair Section */}
          <details open className="bg-gray-800/60 rounded-lg p-4 text-xs border border-gray-600 group">
             <summary className="font-semibold text-gray-300 cursor-pointer hover:text-white list-none flex justify-between items-center">
                <span>Provably Fair Details</span>
                <span className="text-gray-500 group-open:rotate-180 transition-transform duration-200">▼</span>
             </summary>
             <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                {/* Client Seed */}
                <div className="space-y-2">
                    <label htmlFor="clientSeedInput" className="block text-xs font-medium text-gray-400">Client Seed</label>
                    <div className="flex items-center space-x-2">
                        <input id="clientSeedInput" type="text" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)}
                            className="flex-grow p-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-200 focus:ring-1 focus:ring-yellow-500 text-xs font-mono"
                            placeholder="Enter or generate client seed" disabled={isBetting || isFlipping} />
                        <button onClick={() => setClientSeed(crypto.randomBytes(16).toString('hex'))} className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0" title="Generate New" disabled={isBetting || isFlipping}>
                            <ArrowPathIcon className="h-4 w-4 text-gray-300" />
                        </button>
                        <button onClick={() => copyToClipboard(clientSeed)} className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0" title="Copy" disabled={isBetting || isFlipping}>
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
                        </button>
                    </div>
                </div>
                {/* Last Game Verification */}
                {gameResult && !isFlipping && (
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                     <h4 className="font-semibold text-sm mb-1 text-gray-300">Last Bet Verification (Nonce: {gameResult.nonce})</h4>
                     {renderVerificationDetail("Server Seed Hash", gameResult.serverSeedHash)}
                     {renderVerificationDetail("Client Seed", gameResult.clientSeed)}
                     {renderVerificationDetail("Nonce", gameResult.nonce?.toString())}
                     {renderVerificationDetail("Server Seed", gameResult.serverSeed)}
                     {renderVerificationDetail("Result Hash", gameResult.resultHash)}
                     <p className="text-xs text-gray-500 mt-2">Verify result externally.</p>
                  </div>
                )}
             </div>
          </details>
        </div>
      </div>
    </div>
  );
}