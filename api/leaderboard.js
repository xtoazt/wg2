import User from '../models/User.js';
import UserStats from '../models/UserStats.js';
import mongoose from 'mongoose';
import { getLeague } from '../components/utils/leagues.js';

// Improved caching with separate keys for different modes
const CACHE_DURATION = 60000; // 1 minute cache
const cache = new Map();

function getCacheKey(mode, pastDay) {
  return `${mode}_${pastDay ? 'daily' : 'alltime'}`;
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function sendableUser(user) {
  if (!user.username) {
    return null;
  }
  return {
    username: user.username,
    totalXp: user.totalXp ?? user.xpGained ?? 0,
    createdAt: user.created_at,
    gamesLen: user.totalGamesPlayed ?? 0,
    elo: user.elo ?? 1000,
    eloToday: user.elo_today ?? 0,
  };
}

// Improved 24h leaderboard calculation using UserStats model methods
async function getDailyLeaderboard(isXp = true) {
  const scoreField = isXp ? 'totalXp' : 'elo';
  const now = new Date();
  const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  // Get all users who have stats in the last 24h with their deltas
  const userDeltas = await UserStats.aggregate([
    // Match users active in last 24h
    {
      $match: {
        timestamp: { $gte: dayAgo }
      }
    },
    // Sort by userId and timestamp to get latest first
    {
      $sort: { userId: 1, timestamp: -1 }
    },
    // Group by userId to get latest and earliest in 24h period
    {
      $group: {
        _id: '$userId',
        latestStat: { $first: '$$ROOT' },
        earliestStat: { $last: '$$ROOT' }
      }
    },
    // Calculate the actual 24h change
    {
      $project: {
        userId: '$_id',
        latestScore: `$latestStat.${scoreField}`,
        earliestScore: `$earliestStat.${scoreField}`,
        delta: {
          $subtract: [`$latestStat.${scoreField}`, `$earliestStat.${scoreField}`]
        },
        latestTimestamp: '$latestStat.timestamp',
        earliestTimestamp: '$earliestStat.timestamp'
      }
    },
    // Only include users with meaningful changes (positive for XP, any change for ELO)
    {
      $match: isXp ? { delta: { $gt: 0 } } : { delta: { $ne: 0 } }
    },
    // Sort by delta descending
    {
      $sort: { delta: -1 }
    },
    // Limit to top 100
    {
      $limit: 100
    }
  ]);

  // Get user details for all users in the leaderboard
  const userIds = userDeltas.map(delta => delta.userId);
  const users = await User.find({
    _id: { $in: userIds },
    banned: false
  }).select('_id username elo totalXp created_at games').lean();

  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  // Build leaderboard with proper data
  const leaderboard = userDeltas.map((delta, index) => {
    const user = userMap.get(delta.userId);
    if (!user || !user.username) return null;

    return {
      username: user.username,
      totalXp: isXp ? delta.delta : user.totalXp, // For XP show delta, for ELO show current total XP
      createdAt: user.created_at,
      gamesLen: user.games?.length || 0,
      elo: isXp ? user.elo : delta.delta, // For ELO mode show delta in elo field
      eloToday: delta.delta, // Always show the 24h change
      rank: index + 1
    };
  }).filter(user => user !== null);

  return { leaderboard, userDeltas };
}

// Get user's position in daily leaderboard
async function getUserDailyRank(username, isXp = true) {
  const user = await User.findOne({ username: username });
  if (!user) return { rank: null, delta: null };

  const scoreField = isXp ? 'totalXp' : 'elo';
  const now = new Date();
  const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  // Get user's 24h change
  const userStats = await UserStats.find({
    userId: user._id.toString(),
    timestamp: { $gte: dayAgo }
  }).sort({ timestamp: -1 }).limit(1);

  const oldestUserStats = await UserStats.find({
    userId: user._id.toString(),
    timestamp: { $gte: dayAgo }
  }).sort({ timestamp: 1 }).limit(1);

  if (!userStats[0] || !oldestUserStats[0]) {
    return { rank: null, delta: 0 };
  }

  const userDelta = userStats[0][scoreField] - oldestUserStats[0][scoreField];

  // Count how many users have better deltas
  const betterUsersCount = await UserStats.aggregate([
    // Match users active in last 24h
    {
      $match: {
        timestamp: { $gte: dayAgo }
      }
    },
    // Group by userId to get their 24h deltas
    {
      $sort: { userId: 1, timestamp: -1 }
    },
    {
      $group: {
        _id: '$userId',
        latestStat: { $first: '$$ROOT' },
        earliestStat: { $last: '$$ROOT' }
      }
    },
    {
      $project: {
        delta: {
          $subtract: [`$latestStat.${scoreField}`, `$earliestStat.${scoreField}`]
        }
      }
    },
    // Count users with better deltas
    {
      $match: {
        delta: { $gt: userDelta }
      }
    },
    {
      $count: "count"
    }
  ]);

  const rank = betterUsersCount.length > 0 ? betterUsersCount[0].count + 1 : 1;
  return { rank, delta: userDelta };
}

// Get leaderboard data
async function getLeaderboard(req, res) {
  const myUsername = req.body.username;
  const pastDay = req.body.pastDay === true;
  const isXp = req.body.mode === 'xp';

  try {
    const cacheKey = getCacheKey(isXp ? 'xp' : 'elo', pastDay);
    let leaderboard = getCachedData(cacheKey);
    let myRank = null;
    let myScore = null;

    if (!leaderboard) {
      if (pastDay) {
        // Use the new efficient daily leaderboard calculation
        const dailyResult = await getDailyLeaderboard(isXp);
        leaderboard = dailyResult.leaderboard;
        setCachedData(cacheKey, leaderboard);
      } else {
        // All-time leaderboard - simple and efficient
        const sortField = isXp ? 'totalXp' : 'elo';
        const topUsers = await User.find({ banned: false })
          .sort({ [sortField]: -1 })
          .limit(100)
          .lean();

        leaderboard = topUsers.map(sendableUser).filter(user => user !== null);
        setCachedData(cacheKey, leaderboard);
      }
    }

    // Get user's rank and score
    if (myUsername) {
      if (pastDay) {
        const userResult = await getUserDailyRank(myUsername, isXp);
        myRank = userResult.rank;
        myScore = userResult.delta;
      } else {
        // All-time ranking
        const user = await User.findOne({ username: myUsername });
        if (user) {
          const sortField = isXp ? 'totalXp' : 'elo';
          myScore = user[sortField];
          if (myScore) {
            const betterUsersCount = await User.countDocuments({
              [sortField]: { $gt: myScore },
              banned: false
            });
            myRank = betterUsersCount + 1;
          }
        }
      }
    }

    // Return consistent response format
    const responseKey = isXp ? 'myXp' : 'myElo';
    return res.status(200).json({
      leaderboard,
      myRank,
      [responseKey]: myScore
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return res.status(500).json({
      message: 'An error occurred',
      error: error.message
    });
  }
}

// Get ELO rank for a user
async function getEloRank(req, res) {
  const { username, secret } = req.body;

  // Connect to MongoDB
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB);
    } catch (error) {
      return res.status(500).json({ message: 'Database connection failed', error: error.message });
    }
  }

  try {
    // Find user by the provided username or secret
    let user;
    if(username) {
      user = await User.findOne({ username });
    } else if(secret) {
      user = await User.findOne({ secret });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rank = (await User.countDocuments({ elo: { $gt: user.elo },
      banned: false
    }).cache(2000)) + 1;

    // Return the user's elo and rank
    return res.status(200).json({ elo: user.elo, rank, league: getLeague(user.elo),
      duels_wins: user.duels_wins, duels_losses: user.duels_losses,
        duels_tied: user.duels_tied,
      win_rate: user.duels_wins / (user.duels_wins + user.duels_losses + user.duels_tied)
     });
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

export async function setElo(accountId, newElo, gameData) {
  // gamedata -> {draw:true|false, winner: true|false}
  try {
    const user = await User.findById(accountId);
    if (!user) return false;

    const oldElo = user.elo;
    user.elo = newElo;
    
    if (gameData.draw) {
      user.duels_tied += 1;
    } else if (gameData.winner) {
      user.duels_wins += 1;
    } else {
      user.duels_losses += 1;
    }
    
    await user.save();
    return true;
  } catch (error) {
    console.error('Error setting ELO:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action } = req.body;

  switch (action) {
    case 'leaderboard':
      return getLeaderboard(req, res);
    case 'eloRank':
      return getEloRank(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}