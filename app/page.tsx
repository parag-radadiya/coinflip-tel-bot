'use client'

import WebApp from '@twa-dev/sdk'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [userData, setUserData] = useState<WebAppInitData['user'] | null>(null)

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      setUserData(WebApp.initDataUnsafe.user)
    }
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      {userData ? (
        <div className="mx-auto max-w-2xl text-center">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">
              👋 Hello, {userData.first_name}!
            </h1>
            <p className="text-gray-600 text-lg">
              Welcome to your Telegram Mini App
            </p>
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