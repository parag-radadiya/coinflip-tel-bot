'use client';

import Link from 'next/link';
import { FC, ReactNode } from 'react';

// Define the props for the NavItem component
interface NavItemProps {
  href: string;        // The target URL for the navigation link
  icon: ReactNode;     // The SVG icon component or element to display
  label: string;       // The text label for the navigation item
  isActive: boolean;   // Boolean indicating if this item is the currently active page
}

/**
 * Represents a single item in the navigation bar.
 * It displays an icon and a label, linking to a specific page.
 * Applies distinct styling if it's the active item.
 */
const NavItem: FC<NavItemProps> = ({ href, icon, label, isActive }) => {
  // Determine the text color based on the active state
  const textColorClass = isActive ? 'text-white' : 'text-yellow-400 hover:text-yellow-300';

  return (
    <Link href={href} className={`flex flex-col items-center transition-colors duration-150 ${textColorClass}`}>
      {/* Render the provided icon */}
      {icon}
      {/* Render the text label */}
      <span className="text-xs mt-1">{label}</span> {/* Adjusted text size and margin */}
    </Link>
  );
};

export default NavItem;
