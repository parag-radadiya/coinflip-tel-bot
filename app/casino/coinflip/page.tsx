'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import crypto from 'crypto'; // For client seed generation

// Import Custom Hooks
import { useTelegramWallet } from '@/hooks/useTelegramWallet'; // Import the wallet hook
import { useProvablyFair } from '@/hooks/useProvablyFair'; // Import the provably fair hook

// Import Child Components
import BalanceDisplay from '@/app/components/BalanceDisplay';
import CoinDisplay from '@/app/components/CoinDisplay';
import BetControls from '@/app/components/BetControls';
import ProvablyFairDisplay from '@/app/components/ProvablyFairDisplay';
import CoinFlipAnimation from '@/app/components/CoinFlipAnimation';
import GameRulesModal from '@/app/components/GameRulesModal'; // Import the modal component

// --- Type Definitions ---

// Wallet data type is now implicitly handled by the useTelegramWallet hook or should be imported if needed elsewhere

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

// --- Constants ---
const FLIP_ANIMATION_DURATION = 1000; // ms, adjust if CSS animation changes
const RESULT_RESET_DELAY = 2000; // ms, time to show result before resetting

// --- Main Component ---

export default function CoinFlipPage() {
  // --- Custom Hooks ---
  const {
    webAppSdk,
    telegramUserId,
    walletData,
    isLoading: isInitialLoading, // Rename isLoading from hook
    error: initialError,         // Rename error from hook
    setWalletData                // Get the setter from the hook
  } = useTelegramWallet();

  // --- State Hooks ---
  // Bet Amount State
  const [betAmount, setBetAmount] = useState<number>(1);

  // Game Lifecycle State (Reducer)
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]); // State for game history
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // State for rules modal visibility

  // Determine if the game is in an active betting/flipping state (Declared AFTER gameState)
  const isGameActive = gameState.status === 'BETTING' || gameState.status === 'FLIPPING';

  // --- Custom Hooks ---
  // Provably Fair Hook (Instantiated AFTER isGameActive is defined)
  const {
    clientSeed,
    setClientSeed,
    clientSeedError: pfClientSeedError, // Rename to avoid conflict
    nonce,
    setNonce,
    nextServerSeedHash,
    isHashLoading,
    // fetchNextHash, // No longer needed directly in component
    provablyFairError
  } = useProvablyFair({ telegramUserId, webAppSdk, isGameActive });


  // --- Effects ---

  // Client Seed generation and Hash fetching are now handled by useProvablyFair hook

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
    // Use values from useProvablyFair hook
    if (!clientSeed || pfClientSeedError) { webAppSdk?.showAlert('Client seed is missing or invalid.'); return; }
    if (isHashLoading || !nextServerSeedHash || nextServerSeedHash === 'Error' || provablyFairError) {
      webAppSdk?.showAlert(provablyFairError || 'Next game hash not ready. Please wait.'); return;
    }

    // Dispatch action to start the betting process
    dispatch({ type: 'START_BET', payload: { choice } });

  }, [gameState.status, walletData, betAmount, clientSeed, pfClientSeedError, isHashLoading, nextServerSeedHash, provablyFairError, webAppSdk]); // Updated dependencies

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
           // Calculate payout for history
           const payout = resultData.won ? betAmount : -betAmount;
           const newResult: GameResult = { ...resultData, betAmount, payout };

           // Update wallet balance immediately based on server response
           setWalletData(prev => prev ? { ...prev, balance: { ...prev.balance, tokenBalance: resultData.newBalance } } : null);

           // Update game history state
           setGameHistory(prevHistory => [...prevHistory, newResult]);

           // Dispatch success action (pass the already constructed newResult)
           dispatch({ type: 'API_SUCCESS', payload: { result: newResult, betAmount } }); // Pass the full GameResult
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

  }, [gameState.status, gameState.userChoice, telegramUserId, betAmount, clientSeed, nonce, webAppSdk, setWalletData]); // Dependencies use values from hooks

   // --- Effect to Handle Animation Timing ---
   useEffect(() => {
    if (gameState.status === 'FLIPPING' && gameState.lastResult) {
      // We received API result, now trigger the final flip animation
      dispatch({ type: 'START_FLIP_ANIMATION', payload: { finalResult: gameState.lastResult.coinResult } });

      // Set timeout to show result text after animation completes
      const timer = setTimeout(() => {
        dispatch({ type: 'SHOW_RESULT_TEXT' });
      }, FLIP_ANIMATION_DURATION); // Use constant for animation duration

      return () => clearTimeout(timer); // Cleanup timer
    } else if (gameState.status === 'SHOWING_RESULT') {
        // After showing result, set a timer to reset to IDLE for the next bet
        const resetTimer = setTimeout(() => {
            dispatch({ type: 'RESET_GAME' });
            // Use setNonce from the useProvablyFair hook
            setNonce(prevNonce => prevNonce + 1); // Increment nonce for the *next* bet
        }, RESULT_RESET_DELAY); // Use constant for reset delay

        return () => clearTimeout(resetTimer);
    }
  }, [gameState.status, gameState.lastResult, setNonce]); // Added setNonce dependency


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

  // Combine initial errors from wallet hook and provably fair hook
  const combinedInitialError = initialError || pfClientSeedError; // Use error from pf hook

  if (combinedInitialError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4 flex items-center justify-center">
        <div className="bg-red-800/50 border border-red-700 text-red-200 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Initialization Error</h2>
          <p>{combinedInitialError}</p> {/* Display the combined error */}
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
  const isGameDisabled = isGameActive; // Use the correctly placed variable
  // Use values from useProvablyFair hook
  const isProvablyFairReady = !!nextServerSeedHash && nextServerSeedHash !== 'Error' && !isHashLoading && !provablyFairError && !pfClientSeedError;

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
          {/* Title with Rules Button */}
          <div className="flex justify-center items-center relative mb-2">
            <h2 className="text-2xl font-semibold text-center text-white">Coin Flip</h2>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="absolute right-0 text-slate-400 hover:text-blue-400 transition-colors"
              aria-label="Show game rules and limits"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Display Coin Flip Animation */}
          <CoinFlipAnimation
            animationClass={gameState.animationClass}
            lastResult={gameState.lastResult} // Pass the whole lastResult, the child component will pick what it needs
            status={gameState.status}
            animationKey={nonce} // Use nonce from hook
            gameHistory={gameHistory} // Pass game history down
          />

          {/* Display Bet Controls */}
          <BetControls
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            onBetSubmit={handleBetSubmit}
            maxBet={walletData.balance.tokenBalance}
            isDisabled={isGameDisabled}
            isProvablyFairReady={isProvablyFairReady} // Use calculated value
          />

        </div> {/* End Game Area Container */}

        {/* Display Provably Fair Section */}
        <ProvablyFairDisplay
            clientSeed={clientSeed} // from hook
            onClientSeedChange={setClientSeed} // from hook
            nextServerSeedHash={nextServerSeedHash} // from hook
            isNextHashLoading={isHashLoading} // from hook
            nonce={nonce} // from hook
            lastGameResult={gameState.lastResult}
            isDisabled={isGameDisabled}
            webAppSdk={webAppSdk}
        />

        {/* Display Game Error Messages (from reducer) */}
        {gameState.status === 'ERROR' && gameState.error && (
            <div className="mt-4 bg-red-800/60 border border-red-700 text-red-200 p-3 rounded-lg text-center text-sm">
                Error: {gameState.error}
            </div>
        )}

        {/* Display Provably Fair Error Messages (from hook) */}
        {provablyFairError && (
           <div className="mt-4 bg-orange-800/60 border border-orange-700 text-orange-200 p-3 rounded-lg text-center text-sm">
               Provably Fair System Error: {provablyFairError}
           </div>
        )}


      </div> {/* End Max Width Container */}

      {/* Render the Game Rules Modal */}
      <GameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        currentBalance={walletData.balance.tokenBalance} // Pass current balance
      />

    </div> // End Page Container
  );
}
