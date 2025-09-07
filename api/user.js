import User from '../models/User.js';
import UserStatsService from '../components/utils/userStatsService.js';

export const USERNAME_CHANGE_COOLDOWN = 30 * 24 * 60 * 60 * 1000; // 30 days

// Get public account data
async function getPublicAccount(req, res) {
  const { id } = req.body;
  
  // Validate user ID
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Valid user ID is required' });
  }

  try {
    // Find user by the provided ID only (no secrets in public endpoints)
    const user = await User.findById(id).cache(0, `publicData_${id}`);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // convert lastNameChange to number
    const lastNameChange = user.lastNameChange ? new Date(user.lastNameChange).getTime() : 0;

    // Get public data
    const publicData = {
      username: user.username,
      totalXp: user.totalXp,
      createdAt: user.created_at,
      gamesLen: user.totalGamesPlayed || 0,
      canChangeUsername: !user.lastNameChange || Date.now() - lastNameChange > USERNAME_CHANGE_COOLDOWN,
      daysUntilNameChange: lastNameChange ? Math.max(0, Math.ceil((lastNameChange + USERNAME_CHANGE_COOLDOWN - Date.now()) / (24 * 60 * 60 * 1000))) : 0,
      recentChange: user.lastNameChange ? Date.now() - lastNameChange < 24 * 60 * 60 * 1000 : false,
    };

    // Return the public data
    return res.status(200).json(publicData);
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Set username
async function setUsername(req, res) {
  const { secret, username } = req.body;

  if (!secret || !username) {
    return res.status(400).json({ message: 'Secret and username are required' });
  }

  if (typeof secret !== 'string' || typeof username !== 'string') {
    return res.status(400).json({ message: 'Invalid input types' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username change is allowed
    const now = Date.now();
    const lastChange = user.lastNameChange ? new Date(user.lastNameChange).getTime() : 0;
    
    if (user.lastNameChange && (now - lastChange) < USERNAME_CHANGE_COOLDOWN) {
      const daysLeft = Math.ceil((USERNAME_CHANGE_COOLDOWN - (now - lastChange)) / (24 * 60 * 60 * 1000));
      return res.status(400).json({ 
        message: `Username can only be changed once every 30 days. ${daysLeft} days remaining.` 
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Update username and last change time
    user.username = username;
    user.lastNameChange = new Date();
    await user.save();

    return res.status(200).json({ 
      message: 'Username updated successfully',
      username: user.username,
      lastChange: user.lastNameChange
    });

  } catch (error) {
    console.error('Error setting username:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Check name change progress
async function checkNameChangeProgress(req, res) {
  const { secret } = req.body;

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ message: 'Valid secret is required' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = Date.now();
    const lastChange = user.lastNameChange ? new Date(user.lastNameChange).getTime() : 0;
    const timeSinceLastChange = now - lastChange;
    const canChange = timeSinceLastChange >= USERNAME_CHANGE_COOLDOWN;
    const daysRemaining = canChange ? 0 : Math.ceil((USERNAME_CHANGE_COOLDOWN - timeSinceLastChange) / (24 * 60 * 60 * 1000));

    return res.status(200).json({
      canChange,
      daysRemaining,
      lastChange: user.lastNameChange,
      cooldownPeriod: USERNAME_CHANGE_COOLDOWN
    });

  } catch (error) {
    console.error('Error checking name change progress:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Get user progression
async function getUserProgression(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'UserId is required' });
  }

  try {
    // Find user by _id
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's stats progression - all available data
    const progression = await UserStatsService.getUserProgression(user._id);

    return res.status(200).json({ 
      progression,
      userId: user._id,
      username: user.username 
    });
  } catch (error) {
    console.error('Error fetching user progression:', error);
    return res.status(500).json({ 
      message: 'An error occurred', 
      error: error.message 
    });
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action } = req.body;

  switch (action) {
    case 'public':
      return getPublicAccount(req, res);
    case 'setUsername':
      return setUsername(req, res);
    case 'checkNameChange':
      return checkNameChangeProgress(req, res);
    case 'progression':
      return getUserProgression(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}
