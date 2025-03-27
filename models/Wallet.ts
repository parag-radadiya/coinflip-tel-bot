import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  publicKey: string;
  encryptedPrivateKey: string;
  balance: {
    sol: number;
    token: number;
    usdt: number;
  };
  transactions: Array<{
    type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss';
    amount: number;
    tokenType: 'sol' | 'token' | 'usdt';
    timestamp: Date;
    txHash?: string;
    gameId?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  publicKey: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  balance: {
    sol: { type: Number, default: 0 },
    token: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 }
  },
  transactions: [{
    type: { type: String, enum: ['deposit', 'withdrawal', 'bet', 'win', 'loss'], required: true },
    amount: { type: Number, required: true },
    tokenType: { type: String, enum: ['sol', 'token', 'usdt'], required: true },
    timestamp: { type: Date, default: Date.now },
    txHash: { type: String },
    gameId: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update the updatedAt field
WalletSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Check if the model is already defined to prevent overwriting during hot reloads
export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
