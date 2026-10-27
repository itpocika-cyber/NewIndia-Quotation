import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB Error] MONGODB_URI is not defined in environment variables (.env)');
    throw new Error('MONGODB_URI missing in .env');
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DB] MongoDB Connected successfully: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (err) {
    console.error(`[DB Error] MongoDB Connection Error: ${err.message}`);
    throw err;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[DB Warning] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[DB] MongoDB reconnected.');
});
