import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: string;
  isPremium?: boolean;
  lastVisited: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  username: { type: String },
  languageCode: { type: String, required: true },
  isPremium: { type: Boolean, default: false },
  lastVisited: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Check if the model is already defined to prevent overwriting during hot reloads
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
