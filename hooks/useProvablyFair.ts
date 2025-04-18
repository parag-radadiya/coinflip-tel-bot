import { useState, useEffect, useCallback } from 'react';
import crypto from 'crypto';
import WebApp from '@twa-dev/sdk'; // Import the default runtime value

// Define the return type for the hook
interface UseProvablyFairReturn {
  clientSeed: string;
  setClientSeed: React.Dispatch<React.SetStateAction<string>>;
  clientSeedError: string | null;
  nonce: number;
  setNonce: React.Dispatch<React.SetStateAction<number>>;
  nextServerSeedHash: string | null;
  isHashLoading: boolean;
  fetchNextHash: () => Promise<void>; // Expose the fetch function
  provablyFairError: string | null; // Specific error state for this hook
}

// Define expected props for the hook
interface UseProvablyFairProps {
  telegramUserId: number | null;
  webAppSdk: any; // Use 'any' for now, replace with actual type if known
  isGameActive: boolean; // To prevent fetching hash during active game states
}

export function useProvablyFair({ telegramUserId, webAppSdk, isGameActive }: UseProvablyFairProps): UseProvablyFairReturn {
  const [clientSeed, setClientSeed] = useState<string>('');
  const [clientSeedError, setClientSeedError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number>(0);
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string | null>(null);
  const [isHashLoading, setIsHashLoading] = useState<boolean>(false);
  const [provablyFairError, setProvablyFairError] = useState<string | null>(null); // Error state for hash fetching etc.

  // Generate initial client seed
  useEffect(() => {
    setClientSeedError(null);
    try {
      setClientSeed(crypto.randomBytes(16).toString('hex'));
    } catch (e) {
      console.error("Crypto error on initial seed generation:", e);
      setClientSeedError("Failed to generate secure client seed.");
    }
  }, []); // Run only once on mount

  // Function to fetch the next server seed hash
  const fetchNextHash = useCallback(async () => {
    // Don't fetch if prerequisites aren't met, game is active, or client seed failed
    if (!webAppSdk || !telegramUserId || !clientSeed || clientSeedError || isGameActive) {
      return;
    }

    setIsHashLoading(true);
    setNextServerSeedHash(null); // Clear previous hash
    setProvablyFairError(null); // Clear previous errors

    try {
      const url = `/api/casino/next-hash?telegramId=${telegramUserId}&clientSeed=${encodeURIComponent(clientSeed)}&nonce=${nonce}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.serverSeedHash) {
          setNextServerSeedHash(data.serverSeedHash);
        } else {
          throw new Error("Server response missing 'serverSeedHash'.");
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch next hash:', response.status, errorText);
        throw new Error(`Could not load next game hash (Status: ${response.status})`);
      }
    } catch (error: any) {
      console.error('Error fetching next hash:', error);
      setNextServerSeedHash('Error'); // Indicate error state visually if needed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching next hash.';
      setProvablyFairError(errorMessage);
      webAppSdk?.showAlert(errorMessage); // Optionally notify user via Telegram UI
    } finally {
      setIsHashLoading(false);
    }
  }, [clientSeed, nonce, webAppSdk, telegramUserId, isGameActive, clientSeedError]); // Dependencies for the fetch function

  // Effect to automatically fetch the hash when dependencies change
  useEffect(() => {
    fetchNextHash();
  }, [fetchNextHash]); // fetchNextHash has its own dependency array

  return {
    clientSeed,
    setClientSeed,
    clientSeedError,
    nonce,
    setNonce,
    nextServerSeedHash,
    isHashLoading,
    fetchNextHash,
    provablyFairError
  };
}