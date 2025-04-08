'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

export default function CasinoPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const userId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
      setUserId(userId);
      
      // Check if user has wallet
      fetch(`/api/wallet?telegramId=${userId}`)
        .then(res => res.json())
        .then(data => {
          setHasWallet(data.success);
        })
        .catch(() => {
          setHasWallet(false);
        });
    }
  }, []);
  
  const createWallet = async () => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const { id } = window.Telegram.WebApp.initDataUnsafe.user;
      try {
        const response = await fetch('/api/wallet', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ telegramId: id })
        });
        if (response.ok) {
          setHasWallet(true);
        }
      } catch (error) {
        console.error('Error creating wallet:', error);
      }
    }
  };

  if (!userId) {
    console.error('User ID not found');
    return null;
  }

  if (hasWallet === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
        <div className="mx-auto max-w-md">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-3xl font-bold text-white mb-6">Wallet Required</h1>
            <p className="text-gray-300 mb-8">You need a wallet to use the casino features.</p>
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
              onClick={createWallet}
            >
              Create Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

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
