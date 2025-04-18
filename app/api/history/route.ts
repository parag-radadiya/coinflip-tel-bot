import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import GameHistory from '@/models/GameHistory';
import { NextResponse } from 'next/server';
import { fromTokenAmount, TOKEN_DECIMALS } from '@/utils/solanaTokens'; // For converting raw amounts

const HISTORY_PAGE_LIMIT = 25; // Number of history items per page

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || HISTORY_PAGE_LIMIT.toString(), 10);

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId parameter' }, { status: 400 });
    }

    // Find the user first to get their MongoDB _id
    const user = await User.findOne({ telegramId }).select('_id'); // Removed .lean()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const skip = (page - 1) * limit;

    const gameHistory = await GameHistory.find({ userId: user._id })
      .sort({ timestamp: -1 }) // Sort by most recent first
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean for performance

    const totalRecords = await GameHistory.countDocuments({ userId: user._id });

    // Convert raw token amounts to user-friendly format
    const formattedHistory = gameHistory.map(item => ({
        ...item,
        wagerAmount: fromTokenAmount(item.wagerAmount || 0, TOKEN_DECIMALS),
        payoutAmount: fromTokenAmount(item.payoutAmount || 0, TOKEN_DECIMALS),
    }));

    return NextResponse.json({
        history: formattedHistory,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords: totalRecords
    });

  } catch (error: any) {
    console.error('Game history fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch game history: ${error.message || error}` },
      { status: 500 }
    );
  }
}