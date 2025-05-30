import { connectToDatabase } from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import GameHistory from '@/models/GameHistory'; // Import GameHistory model
import { transferTokens, toTokenAmount, fromTokenAmount, TOKEN_DECIMALS } from '@/utils/solanaTokens'; // Import helpers
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
    let payoutAmount = 0; // Initialize payout amount
    let platformFee = 0; // Initialize platform fee

    try {
      // Read platform fee percentage from environment variables, default to 0
      const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0') / 100;

      if (won) {
        // Calculate fee on the raw token amount
        const grossWinningsRaw = toTokenAmount(betAmount, TOKEN_DECIMALS);
        const platformFeeRaw = Math.floor(grossWinningsRaw * feePercent); // Calculate fee on raw amount
        const netWinningsRaw = grossWinningsRaw - platformFeeRaw;

        // Convert back for logging and response
        platformFee = fromTokenAmount(platformFeeRaw, TOKEN_DECIMALS);
        payoutAmount = fromTokenAmount(netWinningsRaw, TOKEN_DECIMALS); // Net winnings for user

        console.log(`User won. Gross Winnings: ${betAmount}, Platform Fee (${(feePercent * 100).toFixed(2)}%): ${platformFee}, Net Winnings: ${payoutAmount}`);
        console.log(`Raw amounts - Gross: ${grossWinningsRaw}, Fee: ${platformFeeRaw}, Net: ${netWinningsRaw}`);

        if (netWinningsRaw > 0) {
            // Transfer the raw net winnings amount
            await transferTokens(adminWalletIdentifier, userPrivateKey, payoutAmount); // transferTokens expects user-friendly amount
        } else {
            console.log(`Net winnings raw amount is zero or less after fee (${netWinningsRaw}), no payout transfer executed.`);
        }
        // Update balance with user-friendly net winnings
        newBalance += payoutAmount;
      } else {
        // User lost, transfer the original bet amount from user to admin
        payoutAmount = 0; // No payout on loss
        platformFee = 0; // No fee on loss
        console.log(`User lost. Transferring bet amount: ${betAmount} from user to admin.`);
        await transferTokens(userPrivateKey, adminWalletIdentifier, betAmount); // transferTokens expects user-friendly amount
        newBalance -= betAmount;
      }
      transferSuccessful = true;
    } catch (transferError: any) {
        console.error('Token transfer error:', transferError);
        // Don't proceed if transfer fails
        return NextResponse.json({ error: `Token transfer failed: ${transferError.message || transferError}` }, { status: 500 });
    }

    // Only update balance, PF state, user stats, and game history if transfer was successful
    if (transferSuccessful) {
        // --- Record Game History and Update User Stats ---
        const wagerAmountRaw = toTokenAmount(betAmount, TOKEN_DECIMALS);
        // payoutAmount is the *net* amount transferred to/from user (already calculated)
        const payoutAmountRaw = toTokenAmount(payoutAmount, TOKEN_DECIMALS);
        // netChangeRaw reflects the actual change to user's balance in raw units
        const netChangeRaw = won ? payoutAmountRaw : -wagerAmountRaw;

        try {
            // Create Game History entry
            const gameHistoryEntry = new GameHistory({
                userId: user._id,
                gameType: 'coinflip',
                wagerAmount: wagerAmountRaw,
                choice: choice.toLowerCase(),
                outcome: won ? 'win' : 'loss',
                payoutAmount: netChangeRaw, // Store the net change
                serverSeed: serverSeed,
                clientSeed: providedClientSeed,
                nonce: nonce,
                resultingHash: resultHash,
                timestamp: new Date()
            });
            await gameHistoryEntry.save();

            // Update User stats
            user.totalWagered += wagerAmountRaw;
            if (won) {
                user.totalWins += 1;
            } else {
                user.totalLosses += 1;
            }
            user.netProfit += netChangeRaw; // Add the net change (positive or negative)
            await user.save();

        } catch (dbError: any) {
            console.error("Error saving game history or user stats:", dbError);
            // Decide if this should be a fatal error for the bet response
            // For now, log it and continue, but the bet itself succeeded.
            // Consider returning a specific error or status if this is critical.
        }
        // --- End Recording ---


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
          betAmount, // Add bet amount
          payoutAmount, // Add payout amount (net winnings or 0)
          platformFee, // Add platform fee (0 if lost)
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
