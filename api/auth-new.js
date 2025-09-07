import { createUUID } from "../components/createUUID.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export default async function handler(req, res) {
  console.log('[Auth-New API] Request received:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB);
      console.log('MongoDB connected');
    }

    const { username, password, action, secret } = req.body;
    console.log('[Auth-New] Action:', action, 'Username:', username);

    if (action === 'login') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

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
        staff: user.staff || false, 
        canMakeClues: user.canMakeClues || false, 
        supporter: user.supporter || false, 
        accountId: user._id 
      });

    } else if (action === 'register') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const secret = createUUID();

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

    } else if (action === 'verify') {
      if (!secret) {
        return res.status(400).json({ error: 'Secret required' });
      }

      const user = await User.findOne({ secret });
      if (user) {
        return res.status(200).json({ 
          secret: user.secret, 
          username: user.username, 
          staff: user.staff || false, 
          canMakeClues: user.canMakeClues || false, 
          supporter: user.supporter || false, 
          accountId: user._id 
        });
      } else {
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('[Auth-New] Error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
