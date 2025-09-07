import { createUUID } from "../components/createUUID.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Pure MongoDB Username/Password Authentication
async function handleAuth(req, res) {
  // Connect to MongoDB
  if (mongoose.connection.readyState !== 1) {
    try {
      if (!process.env.MONGODB) {
        console.error('MONGODB environment variable not set');
        return res.status(500).json({ error: 'Database configuration missing' });
      }
      console.log('Attempting to connect to MongoDB...');
      await mongoose.connect(process.env.MONGODB);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      return res.status(500).json({ error: 'Database connection failed: ' + error.message });
    }
  }

  const { username, password, action } = req.body;
  
  if (action === 'login') {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const user = await User.findOne({ username });
      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({ 
        secret: user.secret, 
        username: user.username, 
        staff: user.staff, 
        canMakeClues: user.canMakeClues, 
        supporter: user.supporter, 
        accountId: user._id 
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed: ' + error.message });
    }
  } else if (action === 'register') {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = new User({
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
      });

      await newUser.save();
      
      return res.status(200).json({ 
        secret: newUser.secret,
        username: newUser.username,
        staff: newUser.staff,
        canMakeClues: newUser.canMakeClues,
        supporter: newUser.supporter,
        accountId: newUser._id
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
  } else if (action === 'verify') {
    const { secret } = req.body;
    if (!secret) {
      return res.status(400).json({ error: 'Secret is required' });
    }

    try {
      const user = await User.findOne({ secret });
      if (!user) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      return res.status(200).json({ 
        secret: user.secret,
        username: user.username,
        staff: user.staff || false,
        canMakeClues: user.canMakeClues || false,
        supporter: user.supporter || false,
        accountId: user._id
      });
    } catch (error) {
      console.error('Verification error:', error);
      return res.status(500).json({ error: 'Verification failed: ' + error.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}

export default async function handler(req, res) {
  console.log('[Auth Direct API] Request received:', req.method, req.url);
  console.log('[Auth Direct API] Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('[Auth Direct API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.body;
  console.log('[Auth Direct API] Action:', action);
  
  if (action === 'login' || action === 'register' || action === 'verify') {
    try {
      return await handleAuth(req, res);
    } catch (error) {
      console.error('[Auth Direct API] Error in handleAuth:', error);
      console.error('[Auth Direct API] Error stack:', error.stack);
      return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  } else {
    console.log('[Auth Direct API] Invalid action:', action);
    return res.status(400).json({ error: 'Invalid action. Use: login, register, or verify' });
  }
}
