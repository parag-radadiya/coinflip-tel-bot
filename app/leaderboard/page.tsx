'use client';

import React, { useState, useEffect } from 'react';
import NavBar from '@/app/components/NavBar';
import LeaderboardTable from '@/app/components/LeaderboardTable'; // We'll create this next
import { useTelegramWallet } from '@/hooks/useTelegramWallet'; // To check if logged in

interface LeaderboardEntry {
    _id: string;
    username?: string;
    firstName: string;
    totalWins: number;
    totalLosses: number;
    totalWagered: number;
    netProfit: number;
}

const LeaderboardPage: React.FC = () => {
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>('netProfit'); // Default sort
    const { isLoading: userLoading } = useTelegramWallet(); // Corrected destructuring

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/leaderboard?sortBy=${sortBy}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
                }
                const data: LeaderboardEntry[] = await response.json();
                setLeaderboardData(data);
            } catch (err: any) {
                console.error("Leaderboard fetch error:", err);
                setError(err.message || 'Failed to load leaderboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [sortBy]); // Refetch when sortBy changes

    const handleSortChange = (newSortBy: string) => {
        setSortBy(newSortBy);
    };

    // Note: We might not strictly need to block rendering based on userLoading here,
    // as the leaderboard data fetch has its own loading state.
    // However, keeping it prevents a potential flash if the hook loads slowly.
    if (userLoading) {
        return <div className="text-center pt-10">Initializing...</div>; // Or a spinner
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <NavBar />
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-6 text-center text-yellow-400">Leaderboard</h1>

                <div className="mb-4 text-center">
                    <span className="mr-2">Sort By:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                        <option value="netProfit">Net Profit</option>
                        <option value="wins">Total Wins</option>
                        <option value="wagered">Total Wagered</option>
                    </select>
                </div>

                {loading && <div className="text-center">Loading leaderboard...</div>}
                {error && <div className="text-center text-red-500">Error: {error}</div>}
                {!loading && !error && (
                    <LeaderboardTable data={leaderboardData} />
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;