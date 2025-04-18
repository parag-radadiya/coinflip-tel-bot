'use client';

import Link from 'next/link';
import { FC } from 'react';

// Define the props for the GameCard component
interface GameCardProps {
  href: string;       // The URL the card links to (e.g., '/casino/coinflip')
  title: string;      // The title of the game
  description: string; // A short description of the game
}

/**
 * A reusable card component to display a link to a casino game.
 * Includes the game's title and description, and links to the game's page.
 */
const GameCard: FC<GameCardProps> = ({ href, title, description }) => {
  return (
    <Link href={href}>
      {/* Apply styling for the card appearance and hover effect */}
      <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-600 hover:bg-gray-700/70 transition-colors duration-200 cursor-pointer h-full flex flex-col justify-center">
        <h2 className="text-xl font-semibold mb-2 text-yellow-400">{title}</h2>
        <p className="text-gray-300 text-sm">{description}</p>
      </div>
    </Link>
  );
};

export default GameCard;
