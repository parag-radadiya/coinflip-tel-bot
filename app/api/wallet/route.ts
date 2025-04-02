import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { createUserWallet } from '@/services/walletService';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { telegramId } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ message: 'Missing telegramId' }, { status: 400 });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const wallet = await createUserWallet(user._id);
    return NextResponse.json({
      publicKey: wallet.publicKey,
      balance: {
        tokenBalance: wallet.balance.token,
        solBalance: wallet.balance.sol,
        usdtBalance: wallet.balance.usdt
      }
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Wallet creation failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const telegramId = req.nextUrl.searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ message: 'Missing telegramId' }, { status: 400 });
    }

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Find the wallet associated with the user's ObjectId
    const wallet = await Wallet.findOne({ userId: user._id });

    if (!wallet) {
      return NextResponse.json({ message: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({
      publicKey: wallet.publicKey,
      balance: {
        tokenBalance: wallet.balance.token,
        solBalance: wallet.balance.sol,
        usdtBalance: wallet.balance.usdt
      }
    });
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return NextResponse.json({ message: 'Error fetching wallet data' }, { status: 500 });
  }
}
