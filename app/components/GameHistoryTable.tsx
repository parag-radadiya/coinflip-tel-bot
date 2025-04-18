import React, { useState } from 'react';

// Interface matching the structure passed from the page component
interface GameHistoryItem {
    _id: string;
    gameType: string;
    wagerAmount: number;
    choice: string;
    outcome: 'win' | 'loss';
    payoutAmount: number; // Net change
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    resultingHash: string;
    timestamp: string; // Date string
}

interface GameHistoryTableProps {
    data: GameHistoryItem[];
}

const GameHistoryTable: React.FC<GameHistoryTableProps> = ({ data }) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const toggleRowExpansion = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    if (!data || data.length === 0) {
        // This case is handled by the parent page, but good practice to include
        return null;
    }

    const formatTimestamp = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Game</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Wager</th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Choice</th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Outcome</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Net Result</th>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {data.map((item) => (
                        <React.Fragment key={item._id}>
                            <tr className="hover:bg-gray-700 transition-colors duration-150">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{formatTimestamp(item.timestamp)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-white capitalize">{item.gameType}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-right">{item.wagerAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-white text-center capitalize">{item.choice}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-center capitalize ${item.outcome === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.outcome}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${item.payoutAmount >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                                    {item.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                                    <button
                                        onClick={() => toggleRowExpansion(item._id)}
                                        className="text-blue-400 hover:text-blue-300 text-xs"
                                        aria-expanded={expandedRow === item._id}
                                        aria-controls={`details-${item._id}`}
                                    >
                                        {expandedRow === item._id ? 'Hide' : 'Show'}
                                    </button>
                                </td>
                            </tr>
                            {/* Expandable Row for Provably Fair Details */}
                            {expandedRow === item._id && (
                                <tr id={`details-${item._id}`} className="bg-gray-750">
                                    <td colSpan={7} className="px-4 py-3 text-xs text-gray-400">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                            <div><strong>Server Seed:</strong> <span className="break-all font-mono">{item.serverSeed}</span></div>
                                            <div><strong>Client Seed:</strong> <span className="break-all font-mono">{item.clientSeed}</span></div>
                                            <div><strong>Nonce:</strong> <span className="font-mono">{item.nonce}</span></div>
                                            <div><strong>Resulting Hash:</strong> <span className="break-all font-mono">{item.resultingHash}</span></div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GameHistoryTable;