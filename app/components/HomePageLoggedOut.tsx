'use client';

import { FC } from 'react';

// Define the structure for user data passed from the parent
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

// Define the props for the LoggedOut component
interface HomePageLoggedOutProps {
  userData: UserData | null;
  onRegister: () => Promise<void>; // Function to call when the register button is clicked
}

/**
 * Component displayed on the home page when the user is not logged in or needs to register.
 * It prompts the user to open the app in Telegram or create an account using their Telegram data.
 */
const HomePageLoggedOut: FC<HomePageLoggedOutProps> = ({ userData, onRegister }) => {
  return (
    <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 space-y-6 text-center border border-gray-600">
      <h1 className="text-3xl font-bold text-white mb-6">🔒 Telegram Login</h1>
      <p className="text-gray-300 mb-8">
        Open in Telegram to auto-login or create your account.
      </p>
      {/* Show the registration button only if user data from Telegram is available */}
      {userData && (
        <button
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          onClick={onRegister} // Call the provided registration handler
        >
          Create User with Telegram Data
        </button>
      )}
    </div>
  );
};

export default HomePageLoggedOut;
