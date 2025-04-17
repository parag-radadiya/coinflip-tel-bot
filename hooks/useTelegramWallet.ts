import { useState, useEffect } from 'react';
// Attempt to import the WebApp type, fallback to any if not found easily
// You might need to install types: npm install --save-dev @twa-dev/types or yarn add --dev @twa-dev/types
// Or find the exact export from '@twa-dev/sdk'
import WebApp from '@twa-dev/sdk'; // Import the default runtime value

// Re-define WalletData here or import from a shared types file
interface WalletData {
  publicKey: string;
  balance: {
    tokenBalance: number;
    solBalance: number;
    usdtBalance: number;
  };
}

interface UseTelegramWalletReturn {
  webAppSdk: typeof WebApp | null; // Use typeof to get the type from the value
  telegramUserId: number | null;
  walletData: WalletData | null;
  isLoading: boolean;
  error: string | null;
  setWalletData: React.Dispatch<React.SetStateAction<WalletData | null>>; // Expose setter
}

export function useTelegramWallet(): UseTelegramWalletReturn {
  const [webAppSdk, setWebAppSdk] = useState<typeof WebApp | null>(null); // Use typeof here as well
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent execution on server-side rendering
    if (typeof window === 'undefined') {
      setError("Cannot initialize outside browser environment.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null); // Reset error on re-run

    import('@twa-dev/sdk')
      .then(SdkModule => {
        const WebAppRuntime = SdkModule.default;
        setWebAppSdk(WebAppRuntime);
        WebAppRuntime.ready(); // Inform Telegram the app is ready

        if (WebAppRuntime.initDataUnsafe?.user) {
          const userId = WebAppRuntime.initDataUnsafe.user.id;
          setTelegramUserId(userId);

          // Fetch Wallet Data for the identified user
          fetch(`/api/wallet?telegramId=${userId}`)
            .then(async response => {
              if (!response.ok) {
                // Try to get a more specific error message from the API response
                let apiErrorMsg = `Failed to load wallet (${response.status})`;
                try {
                  const errorData = await response.json();
                  if (errorData.error) {
                    apiErrorMsg = errorData.error;
                  }
                } catch (e) { /* Ignore JSON parsing error */ }
                throw new Error(apiErrorMsg);
              }
              const data: WalletData = await response.json();

              // Basic validation/normalization for wallet data
              if (!data.balance) {
                 data.balance = { tokenBalance: 0, solBalance: 0, usdtBalance: 0 }; // Default structure
              }
              data.balance.tokenBalance = data.balance.tokenBalance ?? 0; // Ensure tokenBalance exists using nullish coalescing
              data.balance.solBalance = data.balance.solBalance ?? 0;
              data.balance.usdtBalance = data.balance.usdtBalance ?? 0;

              setWalletData(data);
            })
            .catch(walletError => {
              console.error("Wallet fetch error:", walletError);
              setError(walletError instanceof Error ? walletError.message : 'Error loading wallet data.');
              setWalletData(null); // Ensure wallet data is null on error
            })
            .finally(() => {
              setIsLoading(false); // Wallet fetch attempt finished
            });
        } else {
          setError("Could not identify Telegram user. Please open within Telegram.");
          setTelegramUserId(null);
          setWalletData(null);
          setIsLoading(false);
        }
      })
      .catch(importError => {
        console.error("Failed to load Telegram SDK:", importError);
        setError("Failed to initialize Telegram features.");
        setIsLoading(false);
      });
  }, []); // Empty dependency array ensures this runs only once on mount

  // Return the state variables and the setter for walletData
  return { webAppSdk, telegramUserId, walletData, isLoading, error, setWalletData };
}