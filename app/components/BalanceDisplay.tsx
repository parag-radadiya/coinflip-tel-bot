'use client';

import { FC } from 'react';

// Define the props for the BalanceDisplay component
interface BalanceDisplayProps {
  balance: number | undefined | null; // The token balance to display
  isLoading: boolean;                 // Flag to indicate if the balance is still loading
}

/**
 * A simple component to display the user's token balance.
 * Shows a loading state or the formatted balance.
 */
const BalanceDisplay: FC<BalanceDisplayProps> = ({ balance, isLoading }) => {
  return (
    <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 text-center border border-gray-600">
      <div className="text-sm text-gray-400 mb-1">Token Balance</div>
      <div className="text-3xl font-bold text-yellow-400 tracking-wider h-9"> {/* Fixed height */}
        {isLoading ? (
          <div className="h-full w-3/4 mx-auto bg-gray-600 rounded animate-pulse"></div>
        ) : (
          // Format the balance with commas, handle null/undefined
          <span>{balance?.toLocaleString() ?? '0'}</span>
        )}
      </div>
    </div>
  );
};

export default BalanceDisplay;
