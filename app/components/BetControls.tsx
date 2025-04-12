'use client';

import { FC, ChangeEvent } from 'react';

// Define the props for the BetControls component
interface BetControlsProps {
  betAmount: number;                      // Current bet amount value
  onBetAmountChange: (value: number) => void; // Function to call when bet amount changes
  onBetSubmit: (choice: 'heads' | 'tails') => void; // Function to call when Heads or Tails is clicked
  maxBet: number;                         // Maximum allowed bet amount (e.g., user's balance)
  isDisabled: boolean;                    // Flag to disable controls (e.g., during flip/API call)
  isProvablyFairReady: boolean;           // Flag indicating if the next hash is loaded and ready
}

/**
 * Component containing the bet amount input and the Heads/Tails buttons.
 */
const BetControls: FC<BetControlsProps> = ({
  betAmount,
  onBetAmountChange,
  onBetSubmit,
  maxBet,
  isDisabled,
  isProvablyFairReady
}) => {

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Ensure the value is a number, at least 1, and not more than maxBet
    const newValue = Math.max(1, Math.min(Number(e.target.value) || 1, maxBet));
    onBetAmountChange(newValue);
  };

  // Determine if buttons should be disabled based on multiple conditions
  const buttonsDisabled = isDisabled || betAmount <= 0 || betAmount > maxBet || !isProvablyFairReady;

  return (
    <div className="space-y-5">
      {/* Bet Amount Input */}
      <div>
        <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-2">Bet Amount</label>
        <input
          id="betAmount"
          type="number"
          min="1"
          max={maxBet} // Set max attribute for browser validation (though handled in onChange too)
          placeholder="Enter bet amount"
          className="w-full p-3 rounded-lg border border-gray-500 bg-gray-800 text-white text-center text-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-600 disabled:opacity-70 appearance-none" // Removed appearance-none for number input arrows
          value={betAmount}
          onChange={handleAmountChange}
          disabled={isDisabled} // Disable input while flipping/betting
        />
         {/* Optional: Display max bet or balance info */}
         <p className="text-xs text-gray-400 mt-1 text-right">Max: {maxBet.toLocaleString()}</p>
      </div>

      {/* Bet Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onBetSubmit('heads')}
          disabled={buttonsDisabled}
          className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 rounded-lg font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400"
        >
          HEADS
        </button>
        <button
          onClick={() => onBetSubmit('tails')}
          disabled={buttonsDisabled}
          className="p-4 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 rounded-lg font-bold text-lg hover:from-gray-200 hover:to-gray-400 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 disabled:text-gray-400"
        >
          TAILS
        </button>
      </div>
       {!isProvablyFairReady && !isDisabled && (
           <p className="text-xs text-center text-orange-400 pt-1">Waiting for next game hash...</p>
       )}
    </div>
  );
};

export default BetControls;
