'use client';

import Link from 'next/link';
import { FC, MouseEventHandler } from 'react';

// Define the props for the LoggedIn component
interface HomePageLoggedInProps {
  onWalletClick: MouseEventHandler<HTMLAnchorElement>; // Function to handle wallet link click
}

/**
 * Component displayed on the home page when the user is successfully logged in.
 * It provides links to the main sections of the application like Casino and Wallet.
 */
const HomePageLoggedIn: FC<HomePageLoggedInProps> = ({ onWalletClick }) => {
  return (
    <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
      <h1 className="text-3xl font-bold text-white mb-6">🚀 Welcome Back!</h1>
      <p className="text-gray-300 mb-8">Ready to continue your adventure?</p>
      <div className="grid grid-cols-2 gap-4">
        {/* Link to the Casino page */}
        <Link
          href="/casino"
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-semibold py-3 px-6 rounded-lg transition-all"
        >
          Casino
        </Link>
        {/* Link to the Wallet page, with a custom click handler */}
        <Link
          href="/wallet"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          onClick={onWalletClick} // Use the provided click handler
        >
          Wallet
        </Link>
      </div>
    </div>
  );
};

export default HomePageLoggedIn;
