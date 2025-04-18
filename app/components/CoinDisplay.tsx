'use client';

import { FC } from 'react';

// Define the structure for game result data needed by this component
interface GameResultDisplayData {
  won: boolean;
  amount: number;
  coinResult: 'heads' | 'tails';
}

// Define the props for the CoinDisplay component
interface CoinDisplayProps {
  animationClass: string; // CSS class controlling the coin animation (e.g., 'animate-spin-continuous', 'animate-flip-heads')
  gameResult: GameResultDisplayData | null; // The result of the last game, or null if no game played yet
  showResultText: boolean; // Flag to control the visibility of the result text (allows animation timing)
  isFlipping: boolean; // Flag indicating if any animation is currently active
  animationKey: number | string; // Key to force re-render and restart animation (e.g., nonce)
  betAmount: number; // Current bet amount to display on faces
}

/**
 * Component responsible for displaying the animated coin (showing potential win/loss)
 * and the game result text.
 */
const CoinDisplay: FC<CoinDisplayProps> = ({
  animationClass,
  gameResult,
  showResultText,
  isFlipping,
  animationKey,
  betAmount // Receive betAmount prop
}) => {
  // Format the win/loss amounts for display
  const winAmountText = `+${betAmount.toLocaleString()}`;
  const lossAmountText = `-${betAmount.toLocaleString()}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] md:min-h-[220px] space-y-4 bg-gray-800/40 rounded-lg p-4 border border-gray-600 overflow-hidden">
      {/* Coin Animation Container */}
      <div className="coin-container w-28 h-28 md:w-36 md:h-36 perspective">
        <div
          // Use the animationKey to ensure CSS animations restart correctly on subsequent flips
          key={animationKey}
          className={`coin ${animationClass}`} // Apply dynamic animation class
        >
          {/* Coin Front (Heads - Win) - Simplified Style */}
          <div className="coin-face coin-front bg-green-500 text-white text-xl md:text-2xl font-bold flex items-center justify-center rounded-full p-2 text-center leading-tight">
            {winAmountText}
          </div>
          {/* Coin Back (Tails - Loss) - Simplified Style */}
          <div className="coin-face coin-back bg-red-500 text-white text-xl md:text-2xl font-bold flex items-center justify-center rounded-full p-2 text-center leading-tight">
            {lossAmountText}
          </div>
        </div>
      </div>

      {/* Result Text Area (fixed height to prevent layout shifts) */}
      <div className="text-center h-14 flex items-center justify-center">
        {/* Result Text (shown after final flip animation finishes) */}
        {/* Use opacity transition for smoother appearance */}
        <div className={`transition-opacity duration-300 ${showResultText && gameResult ? 'opacity-100' : 'opacity-0'}`}>
          {gameResult && ( // Render content only when result is available and should be shown
            <div className="space-y-1">
              <p className={`text-xl font-bold ${gameResult.won ? 'text-green-400' : 'text-red-400'}`}>
                {gameResult.won ? `+${gameResult.amount.toLocaleString()}` : `-${gameResult.amount.toLocaleString()}`} Tokens!
              </p>
              <p className="text-sm text-gray-300">
                Landed on <span className="font-semibold capitalize">{gameResult.coinResult}</span>
              </p>
            </div>
          )}
        </div>

        {/* Placeholder Text (shown when idle and not flipping) */}
        {!isFlipping && !gameResult && (
          <p className="text-gray-400 text-sm">
            Place your bet!
          </p>
        )}
      </div>
    </div>
  );
};

export default CoinDisplay;
