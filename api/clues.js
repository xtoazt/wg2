import Clue from '../models/Clue.js';
import User from '../models/User.js';

// Get clues for a location
async function getClue(req, res) {
  if (req.method === 'GET') {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ message: 'Missing lat or lng query parameters' });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: 'Invalid lat or lng values' });
      }

      // Fetch clues from the database
      const clues = await Clue.find({ lat: latitude, lng: longitude });

      if(!clues) {
        return res.status(200).json({ error: 'notfound' });
      }

      // Fetch user data and map to the clue results
      let cluesWithUsernames = await Promise.all(clues.map(async (clue) => {
        const user = await User.findById(clue.created_by);
        return {
          id: clue._id,
          cluetext: clue.clue,
          // rating is a decimal128, convert to number
          rating: clue.rating ? parseFloat(clue.rating.toString()) : 0,
          ratingcount: clue.ratingCnt,
          created_by_name: user ? user.username : 'Unknown',
          created_at: new Date() - clue.created_at.getTime(), // Convert to relative time in milliseconds
        };
      }));

      // sort by highest rating
      cluesWithUsernames.sort((a, b) => b.rating - a.rating);

      res.status(200).json(cluesWithUsernames);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching clues' });
    }
  } else {
    // Handle any non-GET requests
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Get clues count for a location
async function getCluesCount(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Missing lat or lng query parameters' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Invalid lat or lng values' });
    }

    const count = await Clue.countDocuments({ lat: latitude, lng: longitude });
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting clues count:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Make a new clue
async function makeClue(req, res) {
  const { lat, lng, clue, secret } = req.body;

  if (!lat || !lng || !clue || !secret) {
    return res.status(400).json({ message: 'Latitude, longitude, clue, and secret are required' });
  }

  if (typeof secret !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can make clues
    if (!user.canMakeClues) {
      return res.status(403).json({ message: 'You do not have permission to make clues' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude values' });
    }

    // Create new clue
    const newClue = new Clue({
      lat: latitude,
      lng: longitude,
      clue: clue.trim(),
      created_by: user._id,
      rating: 0,
      ratingCnt: 0
    });

    await newClue.save();

    return res.status(200).json({ 
      message: 'Clue created successfully',
      clue: {
        id: newClue._id,
        cluetext: newClue.clue,
        rating: newClue.rating,
        ratingcount: newClue.ratingCnt,
        created_by_name: user.username,
        created_at: 0
      }
    });

  } catch (error) {
    console.error('Error creating clue:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Rate a clue
async function rateClue(req, res) {
  const { clueId, rating, secret } = req.body;

  if (!clueId || rating === undefined || !secret) {
    return res.status(400).json({ message: 'Clue ID, rating, and secret are required' });
  }

  if (typeof secret !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  const ratingValue = parseFloat(rating);
  if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const clue = await Clue.findById(clueId);
    if (!clue) {
      return res.status(404).json({ message: 'Clue not found' });
    }

    // Check if user has already rated this clue
    const existingRating = clue.ratings?.find(r => r.userId.toString() === user._id.toString());
    
    if (existingRating) {
      // Update existing rating
      const oldRating = existingRating.rating;
      existingRating.rating = ratingValue;
      
      // Recalculate average rating
      const totalRating = clue.ratings.reduce((sum, r) => sum + r.rating, 0);
      clue.rating = totalRating / clue.ratings.length;
    } else {
      // Add new rating
      if (!clue.ratings) {
        clue.ratings = [];
      }
      
      clue.ratings.push({
        userId: user._id,
        rating: ratingValue
      });
      
      // Calculate new average rating
      const totalRating = clue.ratings.reduce((sum, r) => sum + r.rating, 0);
      clue.rating = totalRating / clue.ratings.length;
      clue.ratingCnt = clue.ratings.length;
    }

    await clue.save();

    return res.status(200).json({ 
      message: 'Clue rated successfully',
      rating: clue.rating,
      ratingCount: clue.ratingCnt
    });

  } catch (error) {
    console.error('Error rating clue:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'get':
      return getClue(req, res);
    case 'count':
      return getCluesCount(req, res);
    case 'make':
      if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
      }
      return makeClue(req, res);
    case 'rate':
      if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
      }
      return rateClue(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}
