'use client'

import { useEffect, useState, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface WalletData {
  publicKey: string;
  balance: {
    tokenBalance: number;
    solBalance: number;
    usdtBalance: number;
  };
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => WebApp.showAlert('Copied to clipboard!'))
        .catch(err => {
          console.error('Failed to copy text: ', err);
          WebApp.showAlert('Failed to copy.');
        });
    } else if (text) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            WebApp.showAlert('Copied to clipboard!');
        } catch (err) {
            console.error('Fallback copy failed: ', err);
            WebApp.showAlert('Failed to copy.');
        }
    }
  }, []);

  // Fetch wallet data function
  const fetchWalletData = useCallback(async () => {
    if (WebApp.initDataUnsafe.user) {
      const { id } = WebApp.initDataUnsafe.user;
      setRefreshing(true);
      try {
        const response = await fetch(`/api/wallet?telegramId=${id}`);
        if (response.ok) {
          const data = await response.json();
          // Ensure balance properties exist
          if (!data.balance) data.balance = {};
          if (typeof data.balance.tokenBalance !== 'number') {
            data.balance.tokenBalance = data.balance.token || 0;
          }
          if (typeof data.balance.solBalance !== 'number') {
            data.balance.solBalance = data.balance.sol || 0;
          }
          if (typeof data.balance.usdtBalance !== 'number') {
            data.balance.usdtBalance = data.balance.usdt || 0;
          }
          setWalletData(data);
        } else {
          console.error('Failed to fetch wallet data');
          WebApp.showAlert('Could not load wallet data');
        }
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        WebApp.showAlert('Error loading wallet data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    } else {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    WebApp.ready();
    fetchWalletData();
  }, [fetchWalletData]);

  const createWallet = async () => {
    if (WebApp.initDataUnsafe.user) {
      const { id } = WebApp.initDataUnsafe.user;
      setLoading(true);
      try {
        const response = await fetch('/api/wallet', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ telegramId: id })
        });
        if (response.ok) {
          const data = await response.json();
          setWalletData(data);
          WebApp.showAlert('Wallet created successfully!');
        } else {
          console.error('Failed to create wallet');
          WebApp.showAlert('Could not create wallet');
        }
      } catch (error) {
        console.error('Error creating wallet:', error);
        WebApp.showAlert('Error creating wallet');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAirdrop = async () => {
    if (!WebApp.initDataUnsafe.user?.id) return;
    
    try {
      const response = await fetch('/api/wallet/airdrop', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ telegramId: WebApp.initDataUnsafe.user.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletData(prev => {
          if (!prev) return data;
          return {
            ...prev,
            balance: data.balance
          };
        });
        WebApp.showAlert('Airdrop successful!');
      } else {
        const errorData = await response.json();
        WebApp.showAlert(`Airdrop failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Airdrop failed:', error);
      WebApp.showAlert('Airdrop failed. Please try again.');
    }
  };

  // Loading State UI
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  // If no wallet data, show create wallet option
  if (!walletData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
        <div className="mx-auto max-w-md">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-3xl font-bold text-white mb-6">Welcome to Your Wallet</h1>
            <p className="text-gray-300 mb-8">You don't have a wallet yet. Create one to start using the app.</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
      <div className="mx-auto max-w-md">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Wallet Overview</h1>
          <button 
            onClick={fetchWalletData} 
            disabled={refreshing}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Refresh wallet data"
          >
            <ArrowPathIcon className={`h-5 w-5 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Public Key Card */}
        <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-300">Public Key</span>
            <button 
              className="text-blue-400 hover:text-blue-300 flex items-center"
              onClick={() => copyToClipboard(walletData.publicKey)}
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="mt-2 text-gray-200 font-mono text-sm break-all bg-gray-800 p-2 rounded">
            {walletData.publicKey}
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Token Balance - Primary */}
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-600">
            <div className="text-sm text-gray-400 mb-1">Token Balance</div>
            <div className="text-3xl font-bold text-blue-400 tracking-wider">
              {walletData.balance.tokenBalance.toLocaleString()}
            </div>
          </div>

          {/* Other Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">SOL Balance</div>
              <div className="text-xl font-bold text-purple-400">
                {walletData.balance.solBalance.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">USDT Balance</div>
              <div className="text-xl font-bold text-green-400">
                {walletData.balance.usdtBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {process.env.NODE_ENV === 'development' && (
          <button
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all mb-4"
            onClick={handleAirdrop}
          >
            Airdrop Test Tokens
          </button>
        )}
      </div>
    </div>
  );
}
