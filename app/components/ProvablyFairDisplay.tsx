'use client';

import { FC, useCallback } from 'react';
import { DocumentDuplicateIcon, ClipboardDocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import crypto from 'crypto'; // Assuming crypto is available client-side or polyfilled

// Define the structure for the last game result data needed for verification display
interface LastGameVerificationData {
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  resultHash?: string;
}

// Define the props for the ProvablyFairDisplay component
interface ProvablyFairDisplayProps {
  clientSeed: string;                     // Current client seed value
  onClientSeedChange: (seed: string) => void; // Function to update client seed
  nextServerSeedHash: string | null;      // Hash for the next game
  isNextHashLoading: boolean;             // Flag indicating if the next hash is loading
  nonce: number;                          // Current nonce for the next bet
  lastGameResult: LastGameVerificationData | null; // Data from the last completed game for verification
  isDisabled: boolean;                    // Flag to disable inputs/buttons (e.g., during flip)
  webAppSdk: any;                         // Telegram SDK instance for alerts/clipboard
}

/**
 * Component responsible for displaying and managing the Provably Fair elements,
 * including client seed input, next server hash display, and last game verification details.
 */
const ProvablyFairDisplay: FC<ProvablyFairDisplayProps> = ({
  clientSeed,
  onClientSeedChange,
  nextServerSeedHash,
  isNextHashLoading,
  nonce,
  lastGameResult,
  isDisabled,
  webAppSdk
}) => {

  // Memoized copy function using useCallback
  const copyToClipboard = useCallback((text: string | undefined) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          webAppSdk?.showAlert('Copied!');
        })
        .catch(err => {
          console.error('Copy failed: ', err);
          webAppSdk?.showAlert('Copy failed.');
        });
    } else {
      webAppSdk?.showAlert('Clipboard not available.');
    }
  }, [webAppSdk]); // Dependency on webAppSdk

  // Helper to render a single verification detail line
  const renderVerificationDetail = (label: string, value: string | number | undefined) => {
    const stringValue = value?.toString(); // Convert number nonce to string
    if (!stringValue) return null;
    return (
      <div className="flex items-center justify-between text-xs break-all py-1">
        <span className="font-medium mr-2 flex-shrink-0 text-gray-400">{label}:</span>
        <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded min-w-0">
          <span className="truncate flex-1 font-mono text-gray-300" title={stringValue}>{stringValue}</span>
          <button onClick={() => copyToClipboard(stringValue)} className="p-1 hover:bg-gray-600 rounded flex-shrink-0" title={`Copy ${label}`}>
            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  // Function to generate a new random client seed
  const generateNewClientSeed = () => {
    try {
      const newSeed = crypto.randomBytes(16).toString('hex');
      onClientSeedChange(newSeed);
    } catch (error) {
        console.error("Crypto error:", error);
        webAppSdk?.showAlert("Failed to generate seed.");
    }
  };

  return (
    <details open className="bg-gray-800/60 rounded-lg p-4 text-xs border border-gray-600 group mt-6">
      <summary className="font-semibold text-gray-300 cursor-pointer hover:text-white list-none flex justify-between items-center">
        <span>Provably Fair Details</span>
        {/* Simple SVG arrow for dropdown indicator */}
        <svg className={`w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="mt-4 space-y-4 border-t border-gray-700 pt-3">

        {/* Next Hash Display */}
        <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-gray-400 text-xs">Next Bet Server Hash</span>
            <span className="text-gray-500 text-xs">Nonce: {nonce}</span>
          </div>
          {isNextHashLoading ? (
            <div className="h-5 bg-gray-600 rounded animate-pulse w-3/4"></div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-gray-200 break-all font-mono text-xs flex-1 truncate" title={nextServerSeedHash || 'N/A'}>
                {nextServerSeedHash || 'N/A'}
              </span>
              <button
                onClick={() => copyToClipboard(nextServerSeedHash || undefined)}
                className="p-1 hover:bg-gray-600 rounded flex-shrink-0"
                title="Copy Next Hash"
                disabled={!nextServerSeedHash || nextServerSeedHash === 'Error'}
              >
                <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Client Seed Input */}
        <div className="space-y-2">
          <label htmlFor="clientSeedInput" className="block text-xs font-medium text-gray-400">Client Seed (Editable)</label>
          <div className="flex items-center space-x-2">
            <input
              id="clientSeedInput"
              type="text"
              value={clientSeed}
              onChange={(e) => onClientSeedChange(e.target.value)}
              className="flex-grow p-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-200 focus:ring-1 focus:ring-yellow-500 text-xs font-mono"
              placeholder="Enter or generate client seed"
              disabled={isDisabled}
            />
            <button
              onClick={generateNewClientSeed}
              className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0"
              title="Generate New Random Seed"
              disabled={isDisabled}
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => copyToClipboard(clientSeed)}
              className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 disabled:opacity-50 flex-shrink-0"
              title="Copy Client Seed"
              disabled={isDisabled}
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Last Game Verification Details */}
        {lastGameResult && !isDisabled && ( // Show only if there's a result and not currently flipping
          <div className="border-t border-gray-700 pt-3 space-y-2">
            <h4 className="font-semibold text-sm mb-1 text-gray-300">Last Bet Verification (Nonce: {lastGameResult.nonce})</h4>
            {renderVerificationDetail("Server Seed Hash", lastGameResult.serverSeedHash)}
            {renderVerificationDetail("Client Seed", lastGameResult.clientSeed)}
            {renderVerificationDetail("Nonce", lastGameResult.nonce)}
            {renderVerificationDetail("Server Seed (Revealed)", lastGameResult.serverSeed)}
            {renderVerificationDetail("Result Hash (Combined)", lastGameResult.resultHash)}
            <p className="text-xs text-gray-500 mt-2">
              You can use an external HMAC_SHA256 calculator (Server Seed as key, ClientSeed:Nonce as message) to verify the Result Hash.
            </p>
          </div>
        )}
      </div>
    </details>
  );
};

export default ProvablyFairDisplay;
