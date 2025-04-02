'use client'

import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

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

  useEffect(() => {
    const fetchData = async () => {
      if (WebApp.initDataUnsafe.user) {
        const { id } = WebApp.initDataUnsafe.user;
        try {
          const response = await fetch(`/api/wallet?telegramId=${id}`);
          if (response.ok) {
            const data = await response.json();
            setWalletData(data);
          } else {
            console.error('Failed to fetch wallet data');
          }
        } catch (error) {
          console.error('Error fetching wallet data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
        } else {
          console.error('Failed to create wallet');
        }
      } catch (error) {
        console.error('Error creating wallet:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // If no wallet data, show create wallet option
  if (!walletData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome to Your Wallet</h1>
            <p className="text-gray-600 mb-8">You don't have a wallet yet. Create one to start using the app.</p>
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Wallet Overview</h1>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-600">Public Key</span>
              <button 
                className="text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => navigator.clipboard.writeText(walletData.publicKey)}
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                Copy
              </button>
            </div>
            <div className="mt-2 text-gray-800 font-mono break-all">
              {walletData.publicKey.slice(0, 6)}...{walletData.publicKey.slice(-4)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-gray-600 mb-2">Token Balance</div> 
              <div className="text-2xl font-bold text-gray-800">
                {walletData.balance.tokenBalance}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-gray-600 mb-2">SOL Balance</div>
              <div className="text-2xl font-bold text-gray-800">
                {walletData.balance.solBalance}
              </div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="text-gray-600 mb-2">USDT Balance</div>
              <div className="text-2xl font-bold text-gray-800">
                {walletData.balance.usdtBalance}
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
              onClick={async () => {
                try {
                  const user = WebApp.initDataUnsafe.user;
                  const response = await fetch('/api/wallet/airdrop', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ telegramId: user?.id })
                  });
                  if (response.ok) {
                    const data = await response.json();
                    setWalletData(data);
                  }
                } catch (error) {
                  console.error('Airdrop failed:', error);
                }
              }}
            >
              Airdrop Test Tokens
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

async function handleAirdrop() {
  try {
    const user = WebApp.initDataUnsafe.user;
    const response = await fetch('/api/wallet/airdrop', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ telegramId: user?.id })
    });
    // ... existing error handling
  } catch (error) {
    console.error('Error fetching wallet data:', error);
  }
};
