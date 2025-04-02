'use client'

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

export default function MarketPage() {
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [mintTokenAmount, setMintTokenAmount] = useState('');
  const [mintUsdtAmount, setMintUsdtAmount] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      setUserId(String(WebApp.initDataUnsafe.user.id));
    }
  }, []);

  const handleBuyTokens = async () => {
    if (!userId) {
      console.error('User ID not found');
      return;
    }
    try {
      const amount = parseFloat(buyAmount);
      if (isNaN(amount) || amount <= 0) {
        console.error('Invalid buy amount');
        return;
      }

      const response = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: userId,
          amount: amount,
          action: 'buy',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error buying tokens:', error);
      alert('Error buying tokens.');
    }
  };

  const handleSellTokens = async () => {
    if (!userId) {
      console.error('User ID not found');
      return;
    }
    try {
      const amount = parseFloat(sellAmount);
      if (isNaN(amount) || amount <= 0) {
        console.error('Invalid sell amount');
        return;
      }
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: userId,
          amount: amount,
          action: 'sell',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error selling tokens:', error);
      alert('Error selling tokens.');
    }
  };

  const handleMintTokens = async () => {
    if (!userId) {
      console.error('User ID not found');
      setMessage('User ID not found');
      return;
    }
    try {
      setIsLoading(true);
      setMessage(null);
      
      const amount = parseFloat(mintTokenAmount);
      if (isNaN(amount) || amount <= 0) {
        setMessage('Invalid amount');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/wallet/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: userId,
          amount: amount,
          tokenType: 'token',
        }),
      });

      const data = await response.json();
      setMessage(data.message);
      
      if (response.ok && data.success) {
        setMintTokenAmount('');
      }
    } catch (error) {
      console.error('Error minting tokens:', error);
      setMessage('Error minting tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintUsdt = async () => {
    if (!userId) {
      console.error('User ID not found');
      setMessage('User ID not found');
      return;
    }
    try {
      setIsLoading(true);
      setMessage(null);
      
      const amount = parseFloat(mintUsdtAmount);
      if (isNaN(amount) || amount <= 0) {
        setMessage('Invalid amount');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/wallet/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: userId,
          amount: amount,
          tokenType: 'usdt',
        }),
      });

      const data = await response.json();
      setMessage(data.message);
      
      if (response.ok && data.success) {
        setMintUsdtAmount('');
      }
    } catch (error) {
      console.error('Error minting USDT:', error);
      setMessage('Error minting USDT');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">Market</h1>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Buy Tokens</h2>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Amount of USDT to spend"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
              />
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleBuyTokens}
              >
                Buy
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Sell Tokens</h2>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Amount of Tokens to sell"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
              />
              <button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleSellTokens}
              >
                Sell
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Mint Tokens</h2>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Amount of Tokens to mint"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={mintTokenAmount}
                onChange={(e) => setMintTokenAmount(e.target.value)}
              />
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleMintTokens}
                disabled={isLoading}
              >
                {isLoading ? 'Minting...' : 'Mint'}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Mint USDT</h2>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Amount of USDT to mint"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={mintUsdtAmount}
                onChange={(e) => setMintUsdtAmount(e.target.value)}
              />
              <button
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleMintUsdt}
                disabled={isLoading}
              >
                {isLoading ? 'Minting...' : 'Mint'}
              </button>
            </div>
          </div>
          {message && (
            <div className={`mt-4 p-3 rounded ${message.includes('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
