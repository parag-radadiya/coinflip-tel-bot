'use client';

import { FC, ChangeEvent } from 'react';
// Import SVG icons as React Components using SVGR (webpack config needed)
import HeadsIcon from '../casino/coinflip/HeadsIcon.svg';
import TailsIcon from '../casino/coinflip/TailsIcon.svg';

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

      {/* Bet Buttons - New Style */}
      <div className="grid grid-cols-2 gap-4">
        {/* Heads Button */}
        <button
          onClick={() => onBetSubmit('heads')}
          disabled={buttonsDisabled}
          className={`
            flex flex-col items-center justify-center p-4 sm:p-6 rounded-lg
            bg-blue-600 hover:bg-blue-700 text-white
            transition-all duration-200 shadow-md hover:shadow-lg
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none
          `}
        >
          <HeadsIcon className="mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 text-yellow-400" /> {/* Render as component, adjust styling */}
          <span className="font-semibold text-sm sm:text-base">BET HEAD</span>
          <span className="text-xs sm:text-sm text-blue-200 mt-1">{betAmount.toFixed(8)}</span> {/* Adjust formatting as needed */}
        </button>

        {/* Tails Button */}
        <button
          onClick={() => onBetSubmit('tails')}
          disabled={buttonsDisabled}
           className={`
            flex flex-col items-center justify-center p-4 sm:p-6 rounded-lg
            bg-blue-600 hover:bg-blue-700 text-white
            transition-all duration-200 shadow-md hover:shadow-lg
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none
          `}
        >
          <TailsIcon className="mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 text-slate-300" /> {/* Render as component, adjust styling */}
          <span className="font-semibold text-sm sm:text-base">BET TAIL</span>
          <span className="text-xs sm:text-sm text-blue-200 mt-1">{betAmount.toFixed(8)}</span> {/* Adjust formatting as needed */}
        </button>
      </div>
       {!isProvablyFairReady && !isDisabled && (
           <p className="text-xs text-center text-orange-400 pt-1">Waiting for next game hash...</p>
       )}
    </div>
  );
};

export default BetControls;
