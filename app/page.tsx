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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6">
      {isLoggedIn ? (
        <MainContent isLoggedIn={isLoggedIn}>
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                🚀 Welcome Back!
              </h1>
              <p className="text-lg text-gray-600">
                Ready to continue your adventure?
              </p>
            </div>
            <Link
              href="/casino"
              className="inline-block px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              Start Playing →
            </Link>
          </div>
        </MainContent>
      ) : (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-800">
                🔒 Telegram Login
              </h1>
              <p className="text-gray-500">
                Open in Telegram to auto-login or create your account
              </p>
            </div>
            {userData && (
              <button
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
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
        </div>
      )}
    </main>
  );
}
