import { MongoClient } from 'mongodb';

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://mynameisrohanandthisismyemail:Roh%40n%20Kum%40r%20S%40lem@cluster0.p6iwx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_DB = 'worldguessr'; // or whatever your database name is

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    const db = client.db(MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function authenticateUser(username, password) {
  const { db } = await connectToDatabase();
  const bcrypt = await import('bcryptjs');
  
  try {
    const user = await db.collection('users').findOne({ username });
    
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      secret: user.secret,
      username: user.username,
      staff: user.staff || false,
      canMakeClues: user.canMakeClues || false,
      supporter: user.supporter || false,
      accountId: user._id.toString()
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function registerUser(username, password) {
  const { db } = await connectToDatabase();
  const bcrypt = await import('bcryptjs');
  const { createUUID } = await import('../createUUID.js');
  
  try {
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      username,
      password: hashedPassword,
      secret: createUUID(),
      staff: false,
      canMakeClues: false,
      supporter: false,
      created_at: new Date(),
      totalXp: 0,
      totalGamesPlayed: 0,
      banned: false,
      friends: [],
      sentReq: [],
      receivedReq: [],
      allowFriendReq: true,
      timeZone: 'America/Los_Angeles',
      streak: 0,
      lastLogin: new Date(),
      firstLoginComplete: false,
      hearted_maps: {},
      rated_clues: {},
      instant_accept_maps: false,
      crazyGamesId: "",
      elo: 1000,
      elo_today: 0,
      elo_history: [],
      lastEloHistoryUpdate: 0,
      duels_wins: 0,
      duels_losses: 0,
      duels_tied: 0,
      lastNameChange: 0
    };

    const result = await db.collection('users').insertOne(newUser);
    
    return {
      secret: newUser.secret,
      username: newUser.username,
      staff: newUser.staff,
      canMakeClues: newUser.canMakeClues,
      supporter: newUser.supporter,
      accountId: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function verifyUser(secret) {
  const { db } = await connectToDatabase();
  
  try {
    const user = await db.collection('users').findOne({ secret });
    
    if (!user) {
      throw new Error('Invalid session');
    }

    return {
      secret: user.secret,
      username: user.username,
      staff: user.staff || false,
      canMakeClues: user.canMakeClues || false,
      supporter: user.supporter || false,
      accountId: user._id.toString()
    };
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}
