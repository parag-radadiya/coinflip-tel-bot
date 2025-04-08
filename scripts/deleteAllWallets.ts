import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wallet from '../models/Wallet'; // Remove .js extension
import { connectToDatabase } from '../lib/mongodb'; // Remove .js extension

dotenv.config(); // Load environment variables from .env

const deleteAllWallets = async () => {
  try {
    await connectToDatabase(); // Use the correct function name

    console.log('Connected to MongoDB. Deleting all wallet documents...');

    // Ensure the model is correctly registered before using deleteMany
    // Mongoose typically handles this, but explicit check can help debugging
    if (!mongoose.models.Wallet) {
        console.error("Wallet model is not registered with Mongoose.");
        throw new Error("Wallet model not registered.");
    }

    const deleteResult = await Wallet.deleteMany({}); // Delete all documents in the Wallet collection

    console.log(`Successfully deleted ${deleteResult.deletedCount} wallet documents.`);

  } catch (error) {
    console.error('Error deleting wallets:', error);
    process.exit(1); // Exit with error code
  } finally {
    await mongoose.disconnect(); // Ensure disconnection
    console.log('Disconnected from MongoDB.');
  }
};

deleteAllWallets();
