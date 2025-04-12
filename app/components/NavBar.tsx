'use client';

import { usePathname } from 'next/navigation';
import NavItem from './NavItem'; // Import the reusable NavItem component

// Define the structure for each navigation item
interface NavLink {
  href: string;
  label: string;
  icon: JSX.Element; // Type for React components/elements
}

/**
 * Main Navigation Bar component.
 * Displays a fixed navigation bar at the bottom of the screen.
 * Uses the NavItem component to render individual navigation links.
 */
export default function NavBar() {
  // Get the current URL path to determine the active link
  const pathname = usePathname();

  // Define the navigation links data
  const navLinks: NavLink[] = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      href: '/wallet',
      label: 'Wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
        </svg>
      ),
    },
    {
      href: '/market',
      label: 'Market',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5 5 5m-10 3l5 5 5-5L7 14z" />
        </svg>
      ),
    },
    {
      href: '/casino',
      label: 'Casino',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    // Fixed navigation bar styling
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-800 to-gray-900 border-t border-gray-700 z-50">
      {/* Flex container to distribute items evenly */}
      <div className="flex justify-around items-center h-16 max-w-screen-md mx-auto px-2">
        {/* Map over the navLinks array to render each NavItem */}
        {navLinks.map((link) => (
          <NavItem
            key={link.href} // Unique key for each item in the list
            href={link.href}
            icon={link.icon}
            label={link.label}
            // Determine if the current link is active by comparing its href with the current pathname
            isActive={pathname === link.href}
          />
        ))}
      </div>
    </nav>
  );
}
