'use client'

import WebApp from '@twa-dev/sdk'
import { useEffect, useState } from 'react'
import React from 'react';
import MainContent from '@/app/components/MainContent';
import { useRouter } from 'next/navigation';

// Define the interface for user data
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  telegramId: number;
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (WebApp.initDataUnsafe.user) {
        const { id } = WebApp.initDataUnsafe.user;
        try {
          const response = await fetch(`/api/user?telegramId=${id}`);
          if (response.ok) {
            const data = await response.json();
            setUserData(data);
          } else {
            console.error('Failed to fetch user data');
            router.push('/'); // Redirect to login page if user not found
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          router.push('/'); // Redirect to login page on error
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/'); // Redirect to login page if no user data
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </main>
    );
  }

  if (!userData) {
    return null; // Component will not render if userData is null, preventing access
  }

  return (
    <MainContent isLoggedIn={true}>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">👤 Profile Details</h1>
              <div className="space-y-3">
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">First Name:</span>
                  <span className="text-gray-800">{userData.first_name}</span>
                </p>
                {userData.last_name && (
                  <p className="flex justify-between">
                    <span className="font-medium text-gray-600">Last Name:</span>
                    <span className="text-gray-800">{userData.last_name}</span>
                  </p>
                )}
                {userData.username && (
                  <p className="flex justify-between">
                    <span className="font-medium text-gray-600">Username:</span>
                    <span className="text-gray-800">@{userData.username}</span>
                  </p>
                  )}
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">User ID:</span>
                  <span className="text-gray-800">{userData.telegramId}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">Language:</span>
                  <span className="text-gray-800">{userData.language_code}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </MainContent>
  );
}
