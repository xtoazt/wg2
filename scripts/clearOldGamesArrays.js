import mongoose from 'mongoose';
import User from '../models/User.js';
import { config } from 'dotenv';
// Load environment variables
config();
// Connect to MongoDB
await mongoose.connect(process.env.MONGODB);

async function clearOldGamesArrays() {
  console.log('Migrating games count and clearing old games arrays...');

  // Count users with games arrays
  const usersWithGames = await User.countDocuments({
    games: { $exists: true, $not: { $size: 0 } }
  });

  console.log(`Found ${usersWithGames} users with old games arrays`);

  if (usersWithGames === 0) {
    console.log('No games arrays to migrate');
    return;
  }

  // Use aggregation to calculate totalGamesPlayed from games.length and update
  const result = await User.updateMany(
    { games: { $exists: true } },
    [
      {
        $set: {
          totalGamesPlayed: {
            $cond: {
              if: { $isArray: "$games" },
              then: { $floor: { $divide: [{ $size: "$games" }, 5] } },
              else: { $ifNull: ["$totalGamesPlayed", 0] }
            }
          }
        }
      },
      {
        $unset: "games"
      }
    ]
  );

  console.log(`Migrated ${result.modifiedCount} users:`);
  console.log('- Set totalGamesPlayed = Math.floor(games.length / 5)');
  console.log('- Removed games field entirely');
  console.log('- APIs will show totalGamesPlayed directly as game count');
  console.log('Space saved! Old games arrays completely removed.');
}

// Run the cleanup
try {
  await clearOldGamesArrays();
  process.exit(0);
} catch (error) {
  console.error('Cleanup failed:', error);
  process.exit(1);
}