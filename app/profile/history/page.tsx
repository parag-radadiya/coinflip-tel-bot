'use client';

import React, { useState, useEffect } from 'react';
import NavBar from '@/app/components/NavBar';
import GameHistoryTable from '@/app/components/GameHistoryTable'; // We'll create this next
import { useTelegramWallet } from '@/hooks/useTelegramWallet';

// Interface matching the structure returned by the /api/history endpoint
interface GameHistoryItem {
    _id: string;
    gameType: string;
    wagerAmount: number;
    choice: string;
    outcome: 'win' | 'loss';
    payoutAmount: number; // This is the net change
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    resultingHash: string;
    timestamp: string; // Date string from API
}

interface HistoryApiResponse {
    history: GameHistoryItem[];
    currentPage: number;
    totalPages: number;
    totalRecords: number;
}

const GameHistoryPage: React.FC = () => {
    const [historyData, setHistoryData] = useState<GameHistoryItem[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { telegramUserId, isLoading: userLoading, error: userError } = useTelegramWallet();

    useEffect(() => {
        if (userLoading || !telegramUserId) {
            // Wait for user ID or if hook is still loading
            if (userError) setError(userError); // Show error from hook if any
            return;
        }

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/history?telegramId=${telegramUserId}&page=${currentPage}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to fetch history: ${response.statusText}`);
                }
                const data: HistoryApiResponse = await response.json();
                setHistoryData(data.history);
                setCurrentPage(data.currentPage);
                setTotalPages(data.totalPages);
            } catch (err: any) {
                console.error("Game history fetch error:", err);
                setError(err.message || 'Failed to load game history.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [telegramUserId, currentPage, userLoading, userError]); // Refetch when user ID or page changes

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (userLoading) {
        return <div className="text-center pt-10 text-white">Loading user data...</div>;
    }
    if (userError) {
         return <div className="text-center pt-10 text-red-500">Error loading user data: {userError}</div>;
    }
     if (!telegramUserId) {
         return <div className="text-center pt-10 text-yellow-500">Could not identify user. Please access via Telegram.</div>;
     }


    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <NavBar />
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-6 text-center text-yellow-400">My Game History</h1>

                {loading && <div className="text-center">Loading history...</div>}
                {error && <div className="text-center text-red-500">Error: {error}</div>}
                {!loading && !error && (
                    <>
                        <GameHistoryTable data={historyData} />
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center mt-6 space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-gray-300">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || loading}
                                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
                 {!loading && !error && historyData.length === 0 && (
                    <div className="text-center text-gray-400 mt-6">You haven&apos;t played any games yet.</div>
                 )}
            </main>
        </div>
    );
};

export default GameHistoryPage;