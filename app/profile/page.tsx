'use client'

import WebApp from '@twa-dev/sdk'
import { useEffect, useState } from 'react'

// Define the interface for user data
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      setUserData(WebApp.initDataUnsafe.user as UserData)
    }
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      {userData ? (
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
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">Username:</span>
                  <span className="text-gray-800">@{userData.username}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">User ID:</span>
                  <span className="text-gray-800">{userData.id}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium text-gray-600">Language:</span>
                  <span className="text-gray-800">{userData.language_code}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </main>
  )
}