import React from 'react';

interface LeaderboardEntry {
    _id: string;
    username?: string;
    firstName: string;
    totalWins: number;
    totalLosses: number;
    totalWagered: number;
    netProfit: number;
}

interface LeaderboardTableProps {
    data: LeaderboardEntry[];
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-400 mt-6">No leaderboard data available yet.</div>;
    }

    return (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/12">Rank</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-4/12">User</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-2/12">Wins</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-2/12">Losses</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-3/12">Wagered</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider w-3/12">Net Profit</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {data.map((entry, index) => (
                        <tr key={entry._id} className="hover:bg-gray-700 transition-colors duration-150">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-400 text-center">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                {entry.username ? `@${entry.username}` : entry.firstName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 text-right">{entry.totalWins.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400 text-right">{entry.totalLosses.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">{entry.totalWagered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${entry.netProfit >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                                {entry.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LeaderboardTable;