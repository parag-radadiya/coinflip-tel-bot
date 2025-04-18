import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { fromTokenAmount, TOKEN_DECIMALS } from '@/utils/solanaTokens'; // For converting raw amounts

const LEADERBOARD_LIMIT = 20; // Number of users to show on the leaderboard

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'netProfit'; // Default sort by net profit
    const limit = parseInt(searchParams.get('limit') || LEADERBOARD_LIMIT.toString(), 10);

    let sortCriteria: { [key: string]: 1 | -1 } = {};
    if (sortBy === 'wins') {
      sortCriteria = { totalWins: -1, netProfit: -1 }; // Sort by wins descending, then profit
    } else if (sortBy === 'wagered') {
      sortCriteria = { totalWagered: -1, netProfit: -1 }; // Sort by wagered descending, then profit
    } else {
      // Default to netProfit
      sortCriteria = { netProfit: -1, totalWins: -1 }; // Sort by profit descending, then wins
    }

    const leaderboardUsers = await User.find({})
      .sort(sortCriteria)
      .limit(limit)
      .select('username firstName totalWins totalLosses totalWagered netProfit') // Select only needed fields
      .lean(); // Use lean for performance

    // Convert raw token amounts (totalWagered, netProfit) to user-friendly format
    const formattedLeaderboard = leaderboardUsers.map(user => ({
        ...user,
        totalWagered: fromTokenAmount(user.totalWagered || 0, TOKEN_DECIMALS),
        netProfit: fromTokenAmount(user.netProfit || 0, TOKEN_DECIMALS),
        // Ensure wins/losses are numbers, default to 0 if null/undefined
        totalWins: user.totalWins ?? 0,
        totalLosses: user.totalLosses ?? 0,
    }));


    return NextResponse.json(formattedLeaderboard);

  } catch (error: any) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch leaderboard: ${error.message || error}` },
      { status: 500 }
    );
  }
}