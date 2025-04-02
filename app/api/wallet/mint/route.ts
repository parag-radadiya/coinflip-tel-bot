import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { mintTestUSDT, mintTestTokens } from '@/services/walletService';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { telegramId, amount, tokenType } = await req.json();

    if (!telegramId || !amount || !tokenType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    let success = false;
    let message = '';

    // Mint tokens based on tokenType
    if (tokenType === 'usdt') {
      success = await mintTestUSDT(user._id.toString(), amount);
      message = success ? `Successfully minted ${amount} USDT` : 'Failed to mint USDT';
    } else if (tokenType === 'token') {
      success = await mintTestTokens(user._id.toString(), amount);
      message = success ? `Successfully minted ${amount} tokens` : 'Failed to mint tokens';
    } else {
      return NextResponse.json({ message: 'Invalid token type' }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({ message, success: true });
    } else {
      return NextResponse.json({ message, success: false }, { status: 500 });
    }
  } catch (error) {
    console.error('Error minting tokens:', error);
    return NextResponse.json({ message: 'Error minting tokens', success: false }, { status: 500 });
  }
}