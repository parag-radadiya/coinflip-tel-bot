import { connectToDatabase } from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper function to generate and hash server seed
const generateProvablyFairData = () => {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  return { serverSeed, serverSeedHash };
};

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');
    const clientSeed = searchParams.get('clientSeed');
    const nonceStr = searchParams.get('nonce'); // Nonce for the *next* bet

    // Validate inputs
    if (!telegramId || !clientSeed || nonceStr === null) {
      return NextResponse.json({ error: 'Missing required query parameters: telegramId, clientSeed, nonce' }, { status: 400 });
    }

    const nonce = parseInt(nonceStr, 10);
    if (isNaN(nonce) || nonce < 0) {
        return NextResponse.json({ error: 'Invalid nonce parameter' }, { status: 400 });
    }

    // Get user and wallet
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userWallet = await Wallet.findOne({ userId: user._id });
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not found for user' }, { status: 404 });
    }

    // Ensure provablyFairState map exists
    if (!userWallet.provablyFairState) {
        userWallet.provablyFairState = new Map();
    }

    // Get state for the specific client seed
    let clientSeedState = userWallet.provablyFairState.get(clientSeed);
    if (!clientSeedState) {
        clientSeedState = new Map();
        userWallet.provablyFairState.set(clientSeed, clientSeedState);
    }

    // Check if data for the requested nonce exists
    const nonceKey = nonce.toString(); // Use string key for Map
    let pfData = clientSeedState.get(nonceKey);

    if (pfData) {
      // Data already generated, return the hash
      return NextResponse.json({ serverSeedHash: pfData.serverSeedHash });
    } else {
      // Data not found, generate, store, and return hash
      const newPfData = generateProvablyFairData();
      // Get the current state for the client seed (or initialize if somehow lost)
      const newStateForClientSeed = userWallet.provablyFairState.get(clientSeed) || new Map();
      newStateForClientSeed.set(nonceKey, newPfData); // Set the data for the nonce
      userWallet.provablyFairState.set(clientSeed, newStateForClientSeed); // Re-set the inner map on the main state

      // Mark the nested map as modified for Mongoose to save it correctly
      userWallet.markModified('provablyFairState'); // Mark the top-level map
      await userWallet.save();

      return NextResponse.json({ serverSeedHash: newPfData.serverSeedHash });
    }

  } catch (error: any) {
    console.error('Get next hash error:', error);
    return NextResponse.json(
      { error: `Failed to get next hash: ${error.message || error}` },
      { status: 500 }
    );
  }
}
