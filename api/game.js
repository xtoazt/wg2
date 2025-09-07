import calcPoints from '../components/calcPoints.js';
import ratelimiter from '../components/utils/ratelimitMiddleware.js';
import Game from '../models/Game.js';
import User from '../models/User.js';
import UserStatsService from '../components/utils/userStatsService.js';
import { createUUID } from '../components/createUUID.js';

// Store game data (single round or batch)
async function storeGame(req, res) {
  const { lat, long, actualLat, actualLong, usedHint, secret, roundTime, maxDist, rounds, official, location } = req.body;

  // secret must be string
  if(typeof secret !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  // Handle batch rounds (singleplayer game completion)
  if(rounds && Array.isArray(rounds)) {
    if(secret) {
      try {
        // Get user info
        const user = await User.findOne({ secret });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Generate unique game ID
        const gameId = `sp_${createUUID()}`;
        
        // Calculate realistic game timing
        const totalRoundTime = rounds.reduce((sum, round) => sum + round.roundTime, 0);
        const gameEndTime = new Date();
        const gameStartTime = new Date(gameEndTime.getTime() - (totalRoundTime * 1000) - (rounds.length * 10000)); // Add 10s between rounds

        // Calculate total duration and points
        const totalDuration = rounds.reduce((sum, round) => sum + round.roundTime, 0); // Keep in seconds
        const totalPoints = rounds.reduce((sum, round) => sum + round.points, 0); // Use actual points from rounds
        const totalXp = rounds.reduce((sum, round) => sum + (round.xp || 0), 0);

        // Prepare rounds data for Games collection
        let currentRoundStart = gameStartTime.getTime();
        const gameRounds = rounds.map((round, index) => {
          const { lat: guessLat, long: guessLong, actualLat, actualLong, usedHint, maxDist, roundTime, xp, points } = round;
          const actualPoints = points; // Use actual points from frontend
          
          const roundStart = new Date(currentRoundStart);
          const roundEnd = new Date(currentRoundStart + (roundTime * 1000));
          const guessTime = new Date(currentRoundStart + (roundTime * 1000));
          
          // Move to next round (add round time + 10 seconds between rounds)
          currentRoundStart += (roundTime * 1000) + 10000;
          
          return {
            roundNumber: index + 1,
            location: {
              lat: actualLat,
              long: actualLong,
              panoId: round.panoId || null,
              country: round.country || null, // We don't have country data in the current structure
              place: round.place || null
            },
            playerGuesses: [{
              playerId: user._id,
              username: user.username || 'Player',
              accountId: user._id,
              guessLat: guessLat,
              guessLong: guessLong,
              points: actualPoints,
              timeTaken: roundTime,
              xpEarned: xp || 0,
              guessedAt: guessTime,
              usedHint: usedHint || false
            }],
            startedAt: roundStart,
            endedAt: roundEnd
            // No roundTimeLimit for singleplayer games - players can take as long as they want
          };
        });

        // Create game document
        const gameDoc = new Game({
          gameId: gameId,
          gameType: 'singleplayer',
          
          settings: {
            location: location || 'all', // Use provided location or default to 'all'
            rounds: rounds.length,
            maxDist: maxDist || 20000,
            timePerRound: null, // No time limit for singleplayer
            official: official !== undefined ? official : true, // Use provided official status or default to true
            showRoadName: false,
            noMove: false,
            noPan: false,
            noZoom: false
          },
          
          startedAt: gameStartTime,
          endedAt: gameEndTime,
          totalDuration: totalDuration,
          
          rounds: gameRounds,
          
          players: [{
            playerId: user._id,
            username: user.username || 'Player',
            accountId: user._id,
            totalPoints: totalPoints,
            totalXp: totalXp,
            averageTimePerRound: rounds.reduce((sum, r) => sum + r.roundTime, 0) / rounds.length,
            finalRank: 1,
            elo: {
              before: null,
              after: null,
              change: null
            }
          }],
          
          result: {
            winner: null,
            isDraw: false,
            maxPossiblePoints: rounds.length * 5000
          },
          
          multiplayer: {
            isPublic: false,
            gameCode: null,
            hostPlayerId: null,
            maxPlayers: 1
          }
        });

        // Save the game to Games collection
        await gameDoc.save();

        // Update user's totalGamesPlayed (increment by 1 per game, not per round)
        await User.updateOne(
          { secret: user.secret },
          { 
            $inc: { 
              totalGamesPlayed: 1,
              totalXp: totalXp
            }
          }
        );

        // Record user stats for analytics
        try {
          await UserStatsService.recordGameStats(user._id, gameId);
        } catch (statsError) {
          console.warn('Failed to record user stats:', statsError);
          // Don't fail the entire request if stats recording fails
        }

        console.log(`Saved singleplayer game ${gameId} for user ${user.username} with ${totalPoints} points`);

      } catch (error) {
        console.error('Error saving singleplayer game:', error);
        return res.status(500).json({ error: 'An error occurred', message: error.message });
      }
    }
    return res.status(200).json({ success: true });
  }

  // Handle single round (multiplayer/legacy)
  // handle impossible cases
  if(lat === actualLat || long === actualLong || roundTime < 0 || maxDist < 10) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  if(secret) {
    try {
      const calcXp = Math.round(calcPoints({ guessLat: lat, guessLon: long, lat: actualLat, lon: actualLong, usedHint, maxDist }) / 50);
      
      // Update user stats directly (for multiplayer individual rounds)
      await User.updateOne(
        { secret },
        { 
          $inc: { totalXp: calcXp },
          $push: { 
            games: {
              xp: calcXp,
              timeTaken: roundTime,
              latLong: [lat, long],
              time: new Date()
            }
          }
        }
      );
    } catch (error) {
      return res.status(500).json({ error: 'An error occurred', message: error.message });
    }
  }
  res.status(200).json({ success: true });
}

// Get game details
async function getGameDetails(req, res) {
  const { gameId, secret } = req.body;

  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required' });
  }

  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user has permission to view this game
    if (secret) {
      const user = await User.findOne({ secret });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user is a player in this game
      const isPlayer = game.players.some(player => player.playerId.toString() === user._id.toString());
      if (!isPlayer && !user.staff) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    return res.status(200).json({ game });
  } catch (error) {
    console.error('Error fetching game details:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Get game history
async function getGameHistory(req, res) {
  const { secret, limit = 20, offset = 0 } = req.body;

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ message: 'Valid secret is required' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get games where user is a player
    const games = await Game.find({
      'players.playerId': user._id
    })
    .sort({ endedAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('gameId gameType settings startedAt endedAt totalDuration players result')
    .lean();

    // Get total count for pagination
    const totalCount = await Game.countDocuments({
      'players.playerId': user._id
    });

    return res.status(200).json({
      games,
      totalCount,
      hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action } = req.body;

  switch (action) {
    case 'store':
      return storeGame(req, res);
    case 'details':
      return getGameDetails(req, res);
    case 'history':
      return getGameHistory(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}
