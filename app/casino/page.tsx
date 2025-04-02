'use client'

import Link from 'next/link';

export default function CasinoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 font-sans">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8 text-yellow-400">Casino Games</h1>

        <div className="grid grid-cols-1 gap-6">
          {/* Coin Flip Game Card */}
          <Link href="/casino/coinflip">
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-600 hover:bg-gray-700/70 transition-colors duration-200 cursor-pointer">
              <h2 className="text-xl font-semibold mb-2">Coin Flip</h2>
              <p className="text-gray-400 text-sm">Flip a coin, double or nothing!</p>
            </div>
          </Link>

          {/* Add more game links here as needed */}
          {/* Example:
          <Link href="/casino/dice">
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-600 hover:bg-gray-700/70 transition-colors duration-200 cursor-pointer">
              <h2 className="text-xl font-semibold mb-2">Dice Roll</h2>
              <p className="text-gray-400 text-sm">Roll the dice and test your luck.</p>
            </div>
          </Link>
          */}
        </div>
      </div>
    </div>
  );
}
