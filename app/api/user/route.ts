import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const telegramId = req.nextUrl.searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ message: 'Missing telegramId' }, { status: 400 });
    }

    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Nest the user data under a 'user' key to match frontend expectation
    return NextResponse.json({
      user: {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
        language_code: user.languageCode,
        is_premium: user.isPremium,
        telegramId: user.telegramId,
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ message: 'Error fetching user data' }, { status: 500 });
  }
}
