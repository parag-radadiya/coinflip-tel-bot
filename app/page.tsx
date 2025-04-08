'use client'

import WebApp from '@twa-dev/sdk';
import { useEffect, useState } from 'react';
import MainContent from '@/app/components/MainContent';
import Link from 'next/link';

interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  added_to_attachment_menu?: boolean;
}

export default function HomePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (WebApp && WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
      const { id } = WebApp.initDataUnsafe.user;
      fetch(`/api/register?telegramId=${id}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.exists) {
            setUserData(WebApp.initDataUnsafe.user as UserData);
            setIsLoggedIn(true);
          } else {
            setUserData(WebApp.initDataUnsafe.user as UserData);
          }
        });
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 md:p-6 pb-24">
      <div className="mx-auto max-w-md">
        {isLoggedIn ? (
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-3xl font-bold text-white mb-6">🚀 Welcome Back!</h1>
            <p className="text-gray-300 mb-8">Ready to continue your adventure?</p>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/casino"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-semibold py-3 px-6 rounded-lg transition-all"
              >
                Casino
              </Link>
              <Link
                href="/wallet"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                onClick={async (e) => {
                  e.preventDefault();
                  const response = await fetch('/api/wallet', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ telegramId: userData?.id })
                  });
                  if (response.ok) {
                    WebApp.showAlert('Wallet created successfully!');
                    window.location.href = '/wallet';
                  } else {
                    WebApp.showAlert('Failed to create wallet');
                  }
                }}
              >
                Wallet
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
            <h1 className="text-3xl font-bold text-white mb-6">🔒 Telegram Login</h1>
            <p className="text-gray-300 mb-8">Open in Telegram to auto-login or create your account</p>
            {userData && (
              <button
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                onClick={async () => {
                  const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData),
                  });

                  if (response.ok) {
                    setIsLoggedIn(true);
                  }
                }}
              >
                Create User with Telegram Data
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
