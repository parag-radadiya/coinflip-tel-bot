import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { 
  getUserKeypair, 
  buyTokens, 
  sellTokens,
  getWalletBalance
} from '@/utils/solanaTokens';
import { getWalletPrivateKey, updateWalletBalances, recordTransaction } from '@/services/walletService';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { telegramId, amount, action } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ message: 'Missing telegramId' }, { status: 400 });
    }

    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const wallet = await Wallet.findOne({ userId: user._id });

    if (!wallet) {
      return NextResponse.json({ message: 'Wallet not found' }, { status: 404 });
    }

    const privateKey = getWalletPrivateKey(wallet);
    const keypair = getUserKeypair(privateKey);

    let success = false;
    if (action === 'buy') {
      success = await buyTokens(privateKey, amount);
      if (success) {
        await updateWalletBalances(user._id);
        await recordTransaction(user._id, 'deposit', amount, 'token');
      }
    } else if (action === 'sell') {
      success = await sellTokens(privateKey, amount);
       if (success) {
        await updateWalletBalances(user._id);
        await recordTransaction(user._id, 'withdrawal', amount, 'token');
      }
    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({ message: 'Transaction successful' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Transaction failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json({ message: 'Error processing transaction' }, { status: 500 });
  }
}
