// scripts/findInvalidPFState.js
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/mongodb.ts'; // Adjust path if needed
import Wallet from '../models/Wallet.ts'; // Adjust path if needed

async function findInvalidProvablyFairStates() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await connectToDatabase();
    console.log('Database connected.');

    console.log('Fetching wallets...');
    // Use a cursor for potentially large collections to avoid loading all into memory
    const cursor = Wallet.find({ provablyFairState: { $exists: true, $ne: null } }).cursor();

    let invalidWalletCount = 0;
    const invalidWalletIds = new Set(); // Use a Set to store unique wallet IDs

    console.log('Scanning wallets for invalid provablyFairState entries...');
    for (let wallet = await cursor.next(); wallet != null; wallet = await cursor.next()) {
      let foundInvalidInWallet = false;
      if (wallet.provablyFairState instanceof Map) {
        for (const [clientSeed, clientSeedState] of wallet.provablyFairState.entries()) {
          if (clientSeedState instanceof Map) {
            for (const [nonce, pfData] of clientSeedState.entries()) {
              // Check if pfData is an object and if the required fields are missing or not strings
              const isServerSeedInvalid = !pfData || typeof pfData.serverSeed !== 'string' || pfData.serverSeed.trim() === '';
              const isHashInvalid = !pfData || typeof pfData.serverSeedHash !== 'string' || pfData.serverSeedHash.trim() === '';

              if (isServerSeedInvalid || isHashInvalid) {
                if (!invalidWalletIds.has(wallet._id.toString())) {
                   console.log(`--------------------------------------------------`);
                   console.log(`Invalid entry found in Wallet ID: ${wallet._id}`);
                   invalidWalletIds.add(wallet._id.toString()); // Add ID to set
                   invalidWalletCount++;
                }
                 console.log(`  - Client Seed: ${clientSeed}`);
                 console.log(`  - Nonce: ${nonce}`);
                 if (isServerSeedInvalid) console.log(`    - Missing or invalid serverSeed: ${pfData?.serverSeed}`);
                 if (isHashInvalid) console.log(`    - Missing or invalid serverSeedHash: ${pfData?.serverSeedHash}`);
                 foundInvalidInWallet = true;
                 // Optional: break inner loops if you only need to know *if* a wallet is invalid, not list all issues
                 // break; // Break nonce loop
              }
            }
          } else {
             if (!invalidWalletIds.has(wallet._id.toString())) {
                console.log(`--------------------------------------------------`);
                console.log(`Invalid structure found in Wallet ID: ${wallet._id}`);
                console.log(`  - Client Seed: ${clientSeed}`);
                console.log(`    - Expected inner Map, found: ${typeof clientSeedState}`);
                invalidWalletIds.add(wallet._id.toString());
                invalidWalletCount++;
                foundInvalidInWallet = true;
             }
          }
          // if (foundInvalidInWallet) break; // Break clientSeed loop
        }
      } else {
         if (!invalidWalletIds.has(wallet._id.toString())) {
            console.log(`--------------------------------------------------`);
            console.log(`Invalid structure found in Wallet ID: ${wallet._id}`);
            console.log(`  - Expected provablyFairState to be a Map, found: ${typeof wallet.provablyFairState}`);
            invalidWalletIds.add(wallet._id.toString());
            invalidWalletCount++;
         }
      }
    }

    console.log('--------------------------------------------------');
    console.log(`Scan complete. Found ${invalidWalletCount} wallet(s) with invalid provablyFairState entries.`);
    if (invalidWalletCount > 0) {
        console.log("Invalid Wallet IDs:", Array.from(invalidWalletIds));
        console.log("\nPlease review these wallets and clean up the invalid entries.");
        console.log("You might need to remove the specific invalid nonce entries or reset the state for the affected client seeds.");
    } else {
        console.log("No invalid provablyFairState entries found.");
    }

  } catch (error) {
    console.error('Error finding invalid provably fair states:', error);
  } finally {
    if (connection && mongoose.connection.readyState === 1) {
      console.log('Disconnecting from database...');
      await mongoose.disconnect();
      console.log('Database disconnected.');
    }
  }
}

findInvalidProvablyFairStates();