import { connectToDatabase } from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { transferTokens } from '@/utils/solanaTokens'; // Removed getUserKeypair as it wasn't used
import { getWalletPrivateKey } from '@/services/walletService';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper function to generate and hash server seed
const generateProvablyFairData = () => {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  return { serverSeed, serverSeedHash };
};

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { telegramId, betAmount, choice, clientSeed: providedClientSeed, nonce } = await req.json();

    // Validate inputs
    if (!telegramId || !betAmount || !choice || !providedClientSeed || nonce === undefined || nonce === null) {
      return NextResponse.json({ error: 'Missing required fields: telegramId, betAmount, choice, clientSeed, nonce' }, { status: 400 });
    }
    if (typeof betAmount !== 'number' || betAmount <= 0) {
        return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
    }
    if (choice.toLowerCase() !== 'heads' && choice.toLowerCase() !== 'tails') {
        return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }
    if (typeof nonce !== 'number' || nonce < 0) {
        return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    // Get user and wallet
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userWallet = await Wallet.findOne({ userId: user._id });
    if (!userWallet || userWallet.balance.token < betAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // --- Provably Fair Logic ---
    // Ensure maps exist
    if (!userWallet.provablyFairState) userWallet.provablyFairState = new Map();
    let clientSeedState = userWallet.provablyFairState.get(providedClientSeed);
    if (!clientSeedState) {
        clientSeedState = new Map();
        userWallet.provablyFairState.set(providedClientSeed, clientSeedState);
    }

    // 1. Retrieve pre-generated data for the CURRENT nonce
    const currentNonceKey = nonce.toString();
    let currentPfData = clientSeedState.get(currentNonceKey);
    let serverSeed: string;
    let serverSeedHash: string; // The hash shown to the user *before* this bet

    if (currentPfData) {
        serverSeed = currentPfData.serverSeed;
        serverSeedHash = currentPfData.serverSeedHash;
    } else {
        // Fallback: Generate if missing (should have been created by GET /next-hash)
        console.warn(`PF data missing for clientSeed ${providedClientSeed}, nonce ${nonce}. Generating fallback.`);
        const fallbackData = generateProvablyFairData();
        serverSeed = fallbackData.serverSeed;
        serverSeedHash = fallbackData.serverSeedHash;
        // Store the fallback data so it's consistent if re-requested
        clientSeedState.set(currentNonceKey, { serverSeed, serverSeedHash });
        userWallet.markModified(`provablyFairState.${providedClientSeed}`);
        // Note: We might skip saving here and let the later save handle it
    }

    // 2. Calculate result using the retrieved/generated serverSeed
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${providedClientSeed}-${nonce}`);
    const resultHash = hmac.digest('hex');

    // Determine outcome from the result hash
    const firstCharValue = parseInt(resultHash.substring(0, 1), 16);
    const coinResult = firstCharValue < 8 ? 'heads' : 'tails';
    const won = coinResult === choice.toLowerCase();
    // --- End Provably Fair Logic ---

    const adminWalletIdentifier = 'casino';
    if (!process.env.ADMIN_WALLET_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Admin wallet not configured' }, { status: 500 });
    }

    const userPrivateKey = getWalletPrivateKey(userWallet);
    let newBalance = userWallet.balance.token;
    let transferSuccessful = false;

    try {
      if (won) {
        await transferTokens(adminWalletIdentifier, userPrivateKey, betAmount);
        newBalance += betAmount;
      } else {
        await transferTokens(userPrivateKey, adminWalletIdentifier, betAmount);
        newBalance -= betAmount;
      }
      transferSuccessful = true;
    } catch (transferError: any) {
        console.error('Token transfer error:', transferError);
        // Don't proceed if transfer fails
        return NextResponse.json({ error: `Token transfer failed: ${transferError.message || transferError}` }, { status: 500 });
    }

    // Only update balance and PF state if transfer was successful
    if (transferSuccessful) {
        // 3. Generate and store data for the NEXT nonce
        const nextNonce = nonce + 1;
        const nextNonceKey = nextNonce.toString();
        const nextPfData = generateProvablyFairData();
        clientSeedState.set(nextNonceKey, nextPfData);

        // Update balance and save wallet (including PF state changes)
        userWallet.balance.token = newBalance;
        userWallet.markModified(`provablyFairState.${providedClientSeed}`); // Ensure nested map changes are saved
        await userWallet.save();

        // Return detailed result including verification data
        return NextResponse.json({
          won,
          newBalance,
          coinResult,
          serverSeed, // Reveal the server seed used for THIS bet
          serverSeedHash, // The hash that was shown before THIS bet
          clientSeed: providedClientSeed,
          nonce,
          resultHash
        });
    } else {
         // This case should ideally not be reached due to the return in catch block, but as a safeguard:
         return NextResponse.json({ error: 'Bet processing failed due to unsuccessful transfer.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Casino bet error:', error);
    return NextResponse.json(
      { error: `Failed to process bet: ${error.message || error}` },
      { status: 500 }
    );
  }
}
