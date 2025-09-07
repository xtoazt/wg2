import jwt from "jsonwebtoken";
const { verify } = jwt;
import axios from "axios";
import { createUUID } from "../components/createUUID.js";
import User from "../models/User.js";
import { Webhook } from "discord-webhook-node";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'postmessage');

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

// Google Authentication
async function googleAuth(req, res) {
  let output = {};
  const { code, secret } = req.body;
  
  if (!code) {
    if(!secret) {
      return res.status(400).json({ error: 'Invalid' });
    }

    const userDb = await User.findOne({
      secret,
    }).select("_id secret username email staff canMakeClues supporter").cache(120);
    if (userDb) {
      output = { secret: userDb.secret, username: userDb.username, email: userDb.email, staff: userDb.staff, canMakeClues: userDb.canMakeClues, supporter: userDb.supporter, accountId: userDb._id };
      if(!userDb.username || userDb.username.length < 1) {
        // try again without cache, to prevent new users getting stuck with no username
       const userDb2  = await User.findOne({
          secret,
        }).select("_id secret username email staff canMakeClues supporter");
        if(userDb2) output = { secret: userDb2.secret, username: userDb2.username, email: userDb2.email, staff: userDb2.staff, canMakeClues: userDb2.canMakeClues, supporter: userDb2.supporter, accountId: userDb2._id };
      }

      return res.status(200).json(output);
    } else {
      return res.status(400).json({ error: 'Invalid' });
    }

  } else {
    // first login
    try {
      // verify the access token
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });

      if(!ticket) {
        return res.status(400).json({ error: 'Invalid token verification' });
      }

      const email = ticket.getPayload()?.email;

      if (!email) {
        return res.status(400).json({ error: 'No email in token' });
      }

      const existingUser = await User.findOne({ email });
      let secret = null;
      if (!existingUser) {
        secret = createUUID();
        const newUser = new User({ email, secret });
        await newUser.save();

        output = { secret: secret, username: undefined, email: email, staff:false, canMakeClues: false, supporter: false, accountId: newUser._id };
      } else {
        output = { secret: existingUser.secret, username: existingUser.username, email: existingUser.email, staff: existingUser.staff, canMakeClues: existingUser.canMakeClues, supporter: existingUser.supporter, accountId: existingUser._id };
      }

      return res.status(200).json(output);
    } catch (error) {
      console.error('Google OAuth error:', error.message);
      return res.status(400).json({ error: 'Authentication failed' });
    }
  }
}

export default async function handler(req, res) {
  // only accept post
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider } = req.body;
  
  if (provider === 'crazygames') {
    return crazyAuth(req, res);
  } else if (provider === 'google') {
    return googleAuth(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid provider' });
  }
}
