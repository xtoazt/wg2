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
      return res.status(500).json({ error: 'Authentication failed' });
    }
  } else if (action === 'register') {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    try {
      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const secret = createUUID();

      // Create new user
      const newUser = new User({ 
        username, 
        password: hashedPassword, 
        secret,
        staff: false,
        canMakeClues: false,
        supporter: false
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
      return res.status(500).json({ error: 'Registration failed' });
    }
  } else if (action === 'verify') {
    const { secret } = req.body;
    
    if (!secret) {
      return res.status(400).json({ error: 'Secret is required' });
    }

    try {
      const user = await User.findOne({ secret }).select("_id secret username staff canMakeClues supporter").cache(120);
      if (user) {
        return res.status(200).json({ 
          secret: user.secret, 
          username: user.username, 
          staff: user.staff, 
          canMakeClues: user.canMakeClues, 
          supporter: user.supporter, 
          accountId: user._id 
        });
      } else {
        return res.status(401).json({ error: 'Invalid session' });
      }
    } catch (error) {
      console.error('Session verification error:', error);
      return res.status(500).json({ error: 'Session verification failed' });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}

export default async function handler(req, res) {
  console.log('[Auth API] Request received:', req.method, req.url);
  
  // only accept post
  if (req.method !== 'POST') {
    console.log('[Auth API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.body;
  console.log('[Auth API] Action:', action);
  
  if (action === 'login' || action === 'register' || action === 'verify') {
    return handleAuth(req, res);
  } else {
    console.log('[Auth API] Invalid action:', action);
    return res.status(400).json({ error: 'Invalid action. Use: login, register, or verify' });
  }
}