'use client';

import { ReactNode } from 'react';
import NavBar from '@/app/components/NavBar';


interface MainContentProps {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

export default function MainContent({ isLoggedIn, children }: MainContentProps) {
  return (
    <>
      <div className="min-h-screen bg-gray-100">
        {/* Your main content goes here */}
        {children}
      </div>
      {isLoggedIn && <NavBar />}
    </>
  );
}
