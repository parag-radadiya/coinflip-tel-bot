'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import crypto from 'crypto'; // For client seed generation

// Import Child Components
import BalanceDisplay from '@/app/components/BalanceDisplay';
import CoinDisplay from '@/app/components/CoinDisplay';
import BetControls from '@/app/components/BetControls';
import ProvablyFairDisplay from '@/app/components/ProvablyFairDisplay';
import CoinFlipAnimation from '@/app/components/CoinFlipAnimation'; // Import the new component

// --- Type Definitions ---

// User data from SDK
interface UserData {
  id: number;
}

// Wallet data from API
interface WalletData {
  publicKey: string;
  balance: {
    tokenBalance: number;
    solBalance: number; // Keep other balances if they exist
    usdtBalance: number;
  };
}

// Result data from the bet API
interface BetApiResponse {
  won: boolean;
  coinResult: 'heads' | 'tails';
  serverSeed: string;
  serverSeedHash: string; // Hash used for the bet
  clientSeed: string;     // Client seed used for the bet
  nonce: number;          // Nonce used for the bet
  resultHash: string;     // Combined hash for verification
  newBalance: number;     // Updated balance from the server
}

// Structure for storing game result details
interface GameResult extends BetApiResponse {
  betAmount: number; // Include the amount bet for display
  payout: number;    // Include the amount won or lost
}

// --- Game State Management (useReducer) ---

type GameStatus = 'IDLE' | 'BETTING' | 'FLIPPING' | 'SHOWING_RESULT' | 'ERROR';

interface GameState {
  status: GameStatus;
  animationClass: string;
  showResultText: boolean;
  lastResult: GameResult | null; // Store the full result of the last game
  error: string | null;
  userChoice: 'heads' | 'tails' | null; // Store the user's choice during the bet
}

type GameAction =
  | { type: 'START_BET'; payload: { choice: 'heads' | 'tails' } }
  | { type: 'API_SUCCESS'; payload: { result: BetApiResponse; betAmount: number } }
  | { type: 'API_ERROR'; payload: { error: string } }
  | { type: 'START_FLIP_ANIMATION'; payload: { finalResult: 'heads' | 'tails' } }
  | { type: 'SHOW_RESULT_TEXT' }
  | { type: 'RESET_GAME' };

const initialGameState: GameState = {
  status: 'IDLE',
  animationClass: '',
  showResultText: false,
  lastResult: null,
  error: null,
  userChoice: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_BET':
      return {
        ...initialGameState, // Reset most state
        status: 'BETTING',
        userChoice: action.payload.choice,
        animationClass: 'animate-spin-continuous', // Start spinning
      };
    case 'API_SUCCESS': {
      // API call finished, result received
      const { result, betAmount } = action.payload;
      // Calculate payout: win = +betAmount, lose = -betAmount
      // TODO: Adjust if multiplier is introduced later
      const payout = result.won ? betAmount : -betAmount;
      return {
        ...state,
        status: 'FLIPPING', // Status indicates we are waiting for animation
        lastResult: { ...result, betAmount, payout }, // Include calculated payout
        error: null,
        // Keep animationClass as 'animate-spin-continuous' until START_FLIP_ANIMATION
      };
    }
    case 'START_FLIP_ANIMATION':
      // Triggered after API success, sets the final animation
       return {
        ...state,
        // status remains 'FLIPPING'
        animationClass: `animate-flip-${action.payload.finalResult}`, // Set final flip animation
      };
    case 'SHOW_RESULT_TEXT':
      // Animation finished
      return {
        ...state,
        status: 'SHOWING_RESULT',
        showResultText: true,
        // animationClass remains showing the final state
      };
    case 'API_ERROR':
      return {
        ...initialGameState, // Reset state on error
        status: 'ERROR',
        error: action.payload.error,
      };
    case 'RESET_GAME':
      // Reset for the next round, keeping last result for display if needed
      return {
        ...initialGameState,
        status: 'IDLE',
        lastResult: state.lastResult, // Keep last result visible until next bet starts
      };
    default:
      return state;
  }
}

// --- Main Component ---

export default function CoinFlipPage() {
  // --- State Hooks ---
  const [webAppSdk, setWebAppSdk] = useState<any>(null);
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For SDK and initial wallet load
  const [initialError, setInitialError] = useState<string | null>(null); // Errors during init

  // Provably Fair State
  const [clientSeed, setClientSeed] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string | null>(null);
  const [isHashLoading, setIsHashLoading] = useState<boolean>(false);

  // Bet Amount State
  const [betAmount, setBetAmount] = useState<number>(1);

  // Game Lifecycle State (Reducer)
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);

  // --- Effects ---

  // Generate initial client seed on mount
  useEffect(() => {
    try {
        setClientSeed(crypto.randomBytes(16).toString('hex'));
    } catch (e) {
        console.error("Crypto error on initial seed generation:", e);
        setInitialError("Failed to generate secure seed.");
    }
  }, []);

  // Initialize SDK and Fetch Initial Wallet Data
  useEffect(() => {
    if (typeof window === 'undefined') {
      setInitialError("Cannot initialize outside browser.");
      setIsInitialLoading(false);
      return;
    }

    setIsInitialLoading(true);
    setInitialError(null);

    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebAppRuntime = SdkModule.default;
        setWebAppSdk(WebAppRuntime);
        WebAppRuntime.ready();

        if (WebAppRuntime.initDataUnsafe?.user) {
          const userId = WebAppRuntime.initDataUnsafe.user.id;
          setTelegramUserId(userId);

          // Fetch Wallet Data
          fetch(`/api/wallet?telegramId=${userId}`)
            .then(async response => {
              if (!response.ok) {
                throw new Error(`Failed to load wallet (${response.status})`);
              }
              const data: WalletData = await response.json();
              // Basic validation/normalization
              if (!data.balance || typeof data.balance.tokenBalance !== 'number') {
                 if (!data.balance) data.balance = { tokenBalance: 0, solBalance: 0, usdtBalance: 0 }; // Default structure
                 data.balance.tokenBalance = data.balance.tokenBalance || 0; // Ensure tokenBalance exists
              }
              setWalletData(data);
            })
            .catch(walletError => {
              console.error("Wallet fetch error:", walletError);
              setInitialError(walletError.message || 'Error loading wallet data.');
              setWalletData(null); // Ensure wallet data is null on error
            })
            .finally(() => {
              setIsInitialLoading(false); // Wallet fetch attempt finished
            });
        } else {
          setInitialError("Please open within Telegram.");
          setTelegramUserId(null);
          setWalletData(null);
          setIsInitialLoading(false);
        }
      })
      .catch(importError => {
        console.error("Failed to load Telegram SDK:", importError);
        setInitialError("Failed to initialize Telegram features.");
        setIsInitialLoading(false);
      });
  }, []); // Run once on mount

  // Fetch Next Server Seed Hash
  const fetchNextHash = useCallback(async () => {
    if (!webAppSdk || !telegramUserId || !clientSeed || gameState.status !== 'IDLE') {
      // Don't fetch if prerequisites aren't met or game is in progress
      return;
    }
    setIsHashLoading(true);
    setNextServerSeedHash(null); // Clear previous hash
    try {
      const url = `/api/casino/next-hash?telegramId=${telegramUserId}&clientSeed=${encodeURIComponent(clientSeed)}&nonce=${nonce}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNextServerSeedHash(data.serverSeedHash);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch next hash:', response.status, errorText);
        setNextServerSeedHash('Error'); // Indicate error state
        webAppSdk?.showAlert(`Could not load next game hash: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching next hash:', error);
      setNextServerSeedHash('Error');
      webAppSdk?.showAlert(`Error fetching next hash: ${error.message}`);
    } finally {
      setIsHashLoading(false);
    }
  }, [clientSeed, nonce, webAppSdk, telegramUserId, gameState.status]); // Re-fetch when these change and game is idle

  // Trigger fetchNextHash when dependencies are ready or change
  useEffect(() => {
    fetchNextHash();
  }, [fetchNextHash]); // fetchNextHash has its own dependencies

  // --- Game Action Trigger ---

  const handleBetSubmit = useCallback((choice: 'heads' | 'tails') => {
    // Basic validation before dispatching
    if (gameState.status !== 'IDLE' && gameState.status !== 'SHOWING_RESULT' && gameState.status !== 'ERROR') return; // Prevent betting if already in progress
    if (!walletData || typeof walletData.balance.tokenBalance !== 'number') {
      webAppSdk?.showAlert('Wallet data not loaded.'); return;
    }
    if (betAmount <= 0 || betAmount > walletData.balance.tokenBalance) {
      webAppSdk?.showAlert('Invalid bet amount or insufficient balance.'); return;
    }
    if (!clientSeed) { webAppSdk?.showAlert('Client seed is missing.'); return; }
    if (isHashLoading || !nextServerSeedHash || nextServerSeedHash === 'Error') {
      webAppSdk?.showAlert('Next game hash not ready. Please wait.'); return;
    }

    // Dispatch action to start the betting process
    dispatch({ type: 'START_BET', payload: { choice } });

  }, [gameState.status, walletData, betAmount, clientSeed, isHashLoading, nextServerSeedHash, webAppSdk]);

  // --- Effect to Handle API Call based on Game State ---
  useEffect(() => {
    if (gameState.status !== 'BETTING' || !telegramUserId || !gameState.userChoice) {
      return; // Only run when in 'BETTING' state with necessary data
    }

    let isMounted = true; // Prevent state updates if component unmounts during API call

    const performBet = async () => {
      try {
        const response = await fetch('/api/casino/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramUserId,
            betAmount,
            choice: gameState.userChoice, // Use choice stored in state
            clientSeed,
            nonce
          })
        });

        const resultData: BetApiResponse | { error: string } = await response.json();

        if (!isMounted) return; // Don't update state if unmounted

        if (response.ok && 'won' in resultData) {
           // Update wallet balance immediately based on server response
           setWalletData(prev => prev ? { ...prev, balance: { ...prev.balance, tokenBalance: resultData.newBalance } } : null);
           // Dispatch success action
           dispatch({ type: 'API_SUCCESS', payload: { result: resultData, betAmount } });
        } else {
          const errorMessage = ('error' in resultData ? resultData.error : null) || `Bet failed (${response.status})`;
          dispatch({ type: 'API_ERROR', payload: { error: errorMessage } });
          webAppSdk?.showAlert(errorMessage);
        }
      } catch (error: any) {
        console.error('Bet API error:', error);
        if (isMounted) {
          const errorMessage = error.message || 'Failed to process bet. Please try again.';
          dispatch({ type: 'API_ERROR', payload: { error: errorMessage } });
          webAppSdk?.showAlert(errorMessage);
        }
      }
    };

    performBet();

    return () => { isMounted = false; }; // Cleanup function

  }, [gameState.status, gameState.userChoice, telegramUserId, betAmount, clientSeed, nonce, webAppSdk]); // Dependencies for the effect

   // --- Effect to Handle Animation Timing ---
   useEffect(() => {
    if (gameState.status === 'FLIPPING' && gameState.lastResult) {
      // We received API result, now trigger the final flip animation
      dispatch({ type: 'START_FLIP_ANIMATION', payload: { finalResult: gameState.lastResult.coinResult } });

      // Set timeout to show result text after animation completes
      const timer = setTimeout(() => {
        dispatch({ type: 'SHOW_RESULT_TEXT' });
      }, 1000); // Match animation duration (adjust if CSS changes)

      return () => clearTimeout(timer); // Cleanup timer
    } else if (gameState.status === 'SHOWING_RESULT') {
        // After showing result, set a timer to reset to IDLE for the next bet
        const resetTimer = setTimeout(() => {
            dispatch({ type: 'RESET_GAME' });
            setNonce(prevNonce => prevNonce + 1); // Increment nonce for the *next* bet
        }, 2000); // Wait 2 seconds before resetting to IDLE

        return () => clearTimeout(resetTimer);
    }
  }, [gameState.status, gameState.lastResult]); // Dependencies for animation timing


  // --- Render Logic ---

  // Initial Loading or Error State
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Game...</p>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4 flex items-center justify-center">
        <div className="bg-red-800/50 border border-red-700 text-red-200 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Initialization Error</h2>
          <p>{initialError}</p>
          {/* Optionally add a button to retry or go back */}
        </div>
      </div>
    );
  }

  // Wallet Required State (if walletData is null after loading and no error)
  if (!walletData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24 flex items-center justify-center">
        <div className="mx-auto max-w-md">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-2xl font-bold text-white mb-4">⚠️ Wallet Not Found</h1>
            <p className="text-gray-300 mb-6">Could not load your wallet data. Please ensure you have created a wallet.</p>
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
              onClick={() => window.location.href = '/wallet'} // Simple navigation
            >
              Go to Wallet Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game UI
  const isGameDisabled = gameState.status === 'BETTING' || gameState.status === 'FLIPPING';
  const isProvablyFairReady = !!nextServerSeedHash && nextServerSeedHash !== 'Error' && !isHashLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 font-sans pb-24">
      <div className="mx-auto max-w-md">
        {/* Display Balance */}
        <BalanceDisplay
          balance={walletData.balance.tokenBalance}
          isLoading={false} // Already handled initial loading
        />

        {/* Game Area Container */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-5 md:p-6 space-y-6 border border-gray-600">
          <h2 className="text-2xl font-semibold text-center text-white mb-2">Coin Flip</h2>

          {/* Display Coin Flip Animation */}
          <CoinFlipAnimation
            animationClass={gameState.animationClass}
            lastResult={gameState.lastResult} // Pass the whole lastResult, the child component will pick what it needs
            status={gameState.status}
            animationKey={nonce} // Use nonce to restart animation
          />

          {/* Display Bet Controls */}
          <BetControls
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            onBetSubmit={handleBetSubmit}
            maxBet={walletData.balance.tokenBalance}
            isDisabled={isGameDisabled}
            isProvablyFairReady={isProvablyFairReady}
          />

        </div> {/* End Game Area Container */}

        {/* Display Provably Fair Section */}
        <ProvablyFairDisplay
            clientSeed={clientSeed}
            onClientSeedChange={setClientSeed}
            nextServerSeedHash={nextServerSeedHash}
            isNextHashLoading={isHashLoading}
            nonce={nonce}
            lastGameResult={gameState.lastResult} // Pass full last result for verification details
            isDisabled={isGameDisabled}
            webAppSdk={webAppSdk}
        />

        {/* Display Game Error Messages */}
        {gameState.status === 'ERROR' && gameState.error && (
            <div className="mt-4 bg-red-800/60 border border-red-700 text-red-200 p-3 rounded-lg text-center text-sm">
                Error: {gameState.error}
            </div>
        )}

      </div> {/* End Max Width Container */}
    </div> // End Page Container
  );
}
