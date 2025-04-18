'use client';

import React, { useState } from 'react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose, currentBalance }) => {
  const [activeTab, setActiveTab] = useState<'Rules' | 'Limits'>('Rules');

  if (!isOpen) return null;

  // Define minimum and maximum bet (max can be user's balance)
  const minBet = 1;
  const maxBet = currentBalance; // Use the passed balance

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md text-slate-200 border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold">Game Rules &amp; Limits</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'Rules' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            onClick={() => setActiveTab('Rules')}
          >
            Rules
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'Limits' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            onClick={() => setActiveTab('Limits')}
          >
            Limits
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'Rules' && (
            <div className="space-y-4 text-sm">
              <h3 className="text-lg font-semibold mb-3">Welcome to Coin Flip!</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Enter the amount you wish to bet.</li>
                <li>Choose your side: <strong className="text-yellow-400">Heads</strong> or <strong className="text-blue-400">Tails</strong>.</li>
                <li>Press the corresponding button to start the flip.</li>
                <li>If the coin lands on your chosen side, you win <strong className="text-green-400">2x</strong> your bet amount! Otherwise, you lose your bet.</li>
              </ol>
              <p className="mt-4 pt-4 border-t border-slate-700">
                Our game uses a <strong>Provably Fair</strong> system. This means the outcome of each flip is determined before you bet and can be verified afterwards, ensuring fairness. Check the &quot;Provably Fair Details&quot; section below the game for more information.
              </p>
            </div>
          )}
          {activeTab === 'Limits' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Betting Limits</h3>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Minimum Bet</label>
                <div className="bg-slate-700 rounded px-3 py-2 text-slate-100">
                  {minBet} Tokens
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Maximum Bet</label>
                <div className="bg-slate-700 rounded px-3 py-2 text-slate-100">
                  {maxBet.toFixed(2)} Tokens <span className="text-xs text-slate-400">(Your current balance)</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Limits are subject to change. Please play responsibly.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 text-right">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameRulesModal;