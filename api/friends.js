import User from "../models/User.js";
import mongoose from "mongoose";

// Connect to MongoDB
async function connectToDatabase() {
  if (mongoose.connection.readyState !== 1) {
    try {
      if (!process.env.MONGODB) {
        throw new Error('MONGODB environment variable not set');
      }
      await mongoose.connect(process.env.MONGODB);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  console.log('[Friends API] Request received:', req.method, req.url);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await connectToDatabase();
  } catch (error) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const { action, accountId, username, friendId } = req.body;

  try {
    if (action === 'getFriends') {
      if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required' });
      }

      const user = await User.findById(accountId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get friend details
      const friends = await User.find({
        _id: { $in: user.friends || [] }
      }).select('_id username');

      const sentRequests = await User.find({
        _id: { $in: user.sentReq || [] }
      }).select('_id username');

      const receivedRequests = await User.find({
        _id: { $in: user.receivedReq || [] }
      }).select('_id username');

      return res.status(200).json({
        friends: friends.map(f => ({ id: f._id.toString(), username: f.username })),
        sentRequests: sentRequests.map(f => ({ id: f._id.toString(), username: f.username })),
        receivedRequests: receivedRequests.map(f => ({ id: f._id.toString(), username: f.username })),
        allowFriendReq: user.allowFriendReq || true
      });

    } else if (action === 'sendRequest') {
      if (!accountId || !username) {
        return res.status(400).json({ error: 'Account ID and username are required' });
      }

      const toUser = await User.findOne({ username });
      if (!toUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const fromUser = await User.findById(accountId);
      if (!fromUser) {
        return res.status(404).json({ error: 'Invalid user' });
      }

      // Check if already friends or request already sent
      if (fromUser.friends?.includes(toUser._id) || fromUser.sentReq?.includes(toUser._id)) {
        return res.status(400).json({ error: 'Friend request already sent or already friends' });
      }

      // Add to sent requests for sender
      await User.findByIdAndUpdate(accountId, {
        $addToSet: { sentReq: toUser._id }
      });

      // Add to received requests for receiver
      await User.findByIdAndUpdate(toUser._id, {
        $addToSet: { receivedReq: accountId }
      });

      return res.status(200).json({ success: true });

    } else if (action === 'acceptRequest') {
      if (!accountId || !friendId) {
        return res.status(400).json({ error: 'Account ID and friend ID are required' });
      }

      // Remove from received requests and add to friends for current user
      await User.findByIdAndUpdate(accountId, {
        $pull: { receivedReq: friendId },
        $addToSet: { friends: friendId }
      });

      // Remove from sent requests and add to friends for friend
      await User.findByIdAndUpdate(friendId, {
        $pull: { sentReq: accountId },
        $addToSet: { friends: accountId }
      });

      return res.status(200).json({ success: true });

    } else if (action === 'removeFriend') {
      if (!accountId || !friendId) {
        return res.status(400).json({ error: 'Account ID and friend ID are required' });
      }

      // Remove friend from both users
      await User.findByIdAndUpdate(accountId, {
        $pull: { friends: friendId }
      });

      await User.findByIdAndUpdate(friendId, {
        $pull: { friends: accountId }
      });

      return res.status(200).json({ success: true });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('[Friends API] Error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
