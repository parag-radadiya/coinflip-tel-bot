import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { airdropSol } from '@/utils/solanaTokens';
import { getWalletPrivateKey, updateWalletBalances } from '@/services/walletService';

export async function POST(req: NextRequest) {
  try {
    if(process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ message: 'Airdrop only available in test environment' }, { status: 403 });
    }

    await connectToDatabase();
    const { telegramId } = await req.json();

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

    const publicKey = new PublicKey(wallet.publicKey);
    const txHash = await airdropSol(publicKey, 1);

    await updateWalletBalances(user._id);
    const updatedWallet = await Wallet.findOne({ userId: user._id });

    return NextResponse.json({ 
      message: '1 SOL airdropped successfully',
      txHash,
      balance: {
        tokenBalance: updatedWallet.balance.tokenBalance,
        solBalance: updatedWallet.balance.solBalance,
        usdtBalance: updatedWallet.balance.usdtBalance
      }
    });

  } catch (error) {
    console.error('Airdrop error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Airdrop failed' },
      { status: 500 }
    );
  }
}