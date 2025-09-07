import jwt from "jsonwebtoken";
const { verify } = jwt;
import axios from "axios";
import { createUUID } from "../components/createUUID.js";
import User from "../models/User.js";
import { Webhook } from "discord-webhook-node";
import bcrypt from "bcryptjs";

// CrazyGames Authentication
async function crazyAuth(req, res) {
  const { token, username } = req.body;
  if (!token || !username) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // make sure they are strings
  if (typeof token !== 'string' || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  let decodedToken;
  try {
    const resp = await axios.get("https://sdk.crazygames.com/publicKey.json");
    const publicKey = resp.data["publicKey"];
    decodedToken = verify(token, publicKey, { algorithms: ["RS256"] });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  const { userId } = decodedToken;

  // check if userId exists
  const user = await User.findOne({ crazyGamesId: userId }).cache(120);
  if (user) {
    return res.status(200).json({ secret: user.secret, username: user.username, email: user.email, staff: user.staff, canMakeClues: user.canMakeClues, supporter: user.supporter, accountId: user._id });
  }

  // check if username is taken
  let newUsername = username.substring(0, 30).replace(/[^a-zA-Z0-9_]/g, '');
  let finalUsername = newUsername;
  let taken = true;
  let trial = 0;
  while (taken) {
    const existing = await User.findOne({ username: finalUsername });
    if (!existing) {
      taken = false;
    } else {
      trial++;
      finalUsername = `${newUsername}${trial}`;
    }
  }

  // create new user
  const secret = createUUID();
  const newUser = new User({ crazyGamesId: userId, username: finalUsername, secret });
  await newUser.save();

  // try {
  //   if (process.env.DISCORD_WEBHOOK) {
  //     const hook = new Webhook(process.env.DISCORD_WEBHOOK);
  //     await hook.send(`New user registered: ${finalUsername}`);
  //   }
  // } catch (error) {
  //   console.error('Discord webhook error:', error);
  // }

  return res.status(200).json({ secret: newUser.secret, username: newUser.username, email: newUser.email, staff: newUser.staff, canMakeClues: newUser.canMakeClues, supporter: newUser.supporter, accountId: newUser._id });
}

// Username/Password Authentication
async function loginAuth(req, res) {
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
  // only accept post
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider, action } = req.body;
  
  if (provider === 'crazygames') {
    return crazyAuth(req, res);
  } else if (provider === 'login' || action === 'login' || action === 'register' || action === 'verify') {
    return loginAuth(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid provider or action' });
  }
}
