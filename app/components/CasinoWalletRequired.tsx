'use client';

import { FC } from 'react';

// Define the props for the component
interface CasinoWalletRequiredProps {
  onCreateWallet: () => Promise<void>; // Function to trigger wallet creation
  isLoading: boolean;                 // Flag to indicate if wallet creation is in progress
}

/**
 * Component displayed on the Casino page when the user needs to create a wallet
 * before accessing casino features.
 */
const CasinoWalletRequired: FC<CasinoWalletRequiredProps> = ({ onCreateWallet, isLoading }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 flex items-center justify-center">
      <div className="mx-auto max-w-md w-full">
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">💰 Wallet Required</h1>
          <p className="text-gray-300 mb-6">
            You need a wallet associated with your account to play casino games.
          </p>
          <button
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCreateWallet}
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CasinoWalletRequired;
