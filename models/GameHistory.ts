import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGameHistory extends Document {
  userId: Types.ObjectId; // Reference to the User model
  gameType: string; // e.g., 'coinflip'
  wagerAmount: number; // Amount wagered (in smallest unit, e.g., lamports)
  choice: string; // User's choice (e.g., 'heads', 'tails')
  outcome: 'win' | 'loss'; // Result of the game
  payoutAmount: number; // Amount won or lost (positive for win, negative for loss, in smallest unit)
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  resultingHash: string;
  timestamp: Date;
}

const GameHistorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameType: { type: String, required: true, index: true },
  wagerAmount: { type: Number, required: true },
  choice: { type: String, required: true },
  outcome: { type: String, enum: ['win', 'loss'], required: true },
  payoutAmount: { type: Number, required: true },
  serverSeed: { type: String, required: true },
  clientSeed: { type: String, required: true },
  nonce: { type: Number, required: true },
  resultingHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Check if the model is already defined
export default mongoose.models.GameHistory || mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);