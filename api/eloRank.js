import mongoose from "mongoose";
import User from "../models/User.js";

// Get ELO rank for a user
export default async function handler(req, res) {
  console.log('[EloRank API] Request received:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB for eloRank...');
      await mongoose.connect(process.env.MONGODB);
      console.log('MongoDB connected for eloRank');
    }

    // Get username from query params (GET) or body (POST)
    const username = req.method === 'GET' ? req.query.username : req.body.username;
    const secret = req.method === 'POST' ? req.body.secret : null;

    console.log('[EloRank] Looking for user:', username || 'by secret');

    if (!username && !secret) {
      return res.status(400).json({ error: 'Username or secret is required' });
    }

    // Find user by the provided username or secret
    let user;
    if (username) {
      user = await User.findOne({ username });
    } else if (secret) {
      user = await User.findOne({ secret });
    }

    if (!user) {
      console.log('[EloRank] User not found:', username || 'by secret');
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate rank
    const rank = (await User.countDocuments({ 
      elo: { $gt: user.elo },
      banned: false
    })) + 1;

    // Get league based on ELO
    const getLeague = (elo) => {
      if (elo >= 2000) return 'Master';
      if (elo >= 1800) return 'Diamond';
      if (elo >= 1600) return 'Platinum';
      if (elo >= 1400) return 'Gold';
      if (elo >= 1200) return 'Silver';
      if (elo >= 1000) return 'Bronze';
      return 'Iron';
    };

    // Calculate win rate
    const totalGames = user.duels_wins + user.duels_losses + user.duels_tied;
    const winRate = totalGames > 0 ? user.duels_wins / totalGames : 0;

    const response = {
      elo: user.elo || 1000, // Default ELO for new users
      rank,
      league: getLeague(user.elo || 1000),
      duels_wins: user.duels_wins || 0,
      duels_losses: user.duels_losses || 0,
      duels_tied: user.duels_tied || 0,
      win_rate: winRate
    };

    console.log('[EloRank] Returning data for user:', user.username, response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('[EloRank] Error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
