import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
