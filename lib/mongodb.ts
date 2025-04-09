import mongoose from 'mongoose';

// Define the shape of the cached object
interface MongooseCache {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

// Extend the NodeJS Global type or use globalThis for broader compatibility
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// Initialize the cache object. If global.mongoose exists, use it; otherwise, create a new cache object.
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// If global.mongoose doesn't exist, assign the newly created cache object to it.
if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToDatabase(): Promise<mongoose.Mongoose> {
  if (cached.conn) {
    // console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering
      // useNewUrlParser: true, // Deprecated, default is true
      // useUnifiedTopology: true, // Deprecated, default is true
    };
    // console.log('Creating new database connection promise');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      // console.log('Database connection successful');
      return mongooseInstance;
    });
    // Ensure the promise is stored globally as well
    global.mongoose!.promise = cached.promise;
  }

  try {
    // console.log('Awaiting database connection promise');
    cached.conn = await cached.promise;
    // Ensure the connection is stored globally as well
    global.mongoose!.conn = cached.conn;
  } catch (e) {
    // console.error('Database connection failed:', e);
    // Reset the promise cache on error
    cached.promise = null;
    global.mongoose!.promise = null;
    throw e;
  }

  if (!cached.conn) {
    throw new Error('Failed to establish database connection.');
  }

  return cached.conn;
}

export { connectToDatabase };
