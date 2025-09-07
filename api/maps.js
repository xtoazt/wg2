import sendableMap from "../components/utils/sendableMap.js";
import Map from "../models/Map.js";
import User from "../models/User.js";
import officialCountryMaps from '../public/officialCountryMaps.json' with { type: "json" };
import { getServerSecret } from "../components/auth/serverAuth.js";
import msToTime from "../components/msToTime.js";
import mapConst from "../components/maps/mapConst.js";
import parseMapData from "../components/utils/parseMapData.js";
import generateSlug from "../components/utils/slugGenerator.js";
import { Filter} from 'bad-words';
import countries from '../public/countries.json' with { type: "json" };

const filter = new Filter();

let mapCache = {
  popular: {
    data: [],
    timeStamp: 0,
    persist: 9600000
  },
  recent: {
    data: [],
    timeStamp: 0,
    persist: 4800000
  },
  spotlight: {
    data: [],
    timeStamp: 0,
    persist: 48000000
  }
}

// Function to convert latitude and longitude to Cartesian coordinates
function latLngToCartesian(lat, lng) {
  const R = 6371; // Earth radius in km
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  const x = R * Math.cos(phi) * Math.cos(theta);
  const y = R * Math.cos(phi) * Math.sin(theta);
  const z = R * Math.sin(phi);
  return { x, y, z };
}

// Function to calculate the distance between two Cartesian coordinates
function calculateDistance(cart1, cart2) {
  const dx = cart1.x - cart2.x;
  const dy = cart1.y - cart2.y;
  const dz = cart1.z - cart2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

async function validateMap(name, data, description_short, description_long, edit=false, mapId=null) {
  if(!name || !data || !description_short) {
    return 'Missing name, data, or description_short';
  }

  name = name.trim();
  description_short = description_short.trim();
  description_long = description_long ? description_long.trim() : '';

  // name cannot include crazygamesdue to a url detection bug
  if(name.toLowerCase().includes('crazygames')) {
    return 'Name cannot include "CrazyGames"';
  }

  // validate name
  if(typeof name !== 'string' || name.length < mapConst.MIN_NAME_LENGTH  || name.length > mapConst.MAX_NAME_LENGTH) {
    return `Name must be between ${mapConst.MIN_NAME_LENGTH} and ${mapConst.MAX_NAME_LENGTH} characters`;
  }

  // validate short description
  if(typeof description_short !== 'string' || description_short.length < mapConst.MIN_SHORT_DESCRIPTION_LENGTH || description_short.length > mapConst.MAX_SHORT_DESCRIPTION_LENGTH) {
    return `Short description must be between ${mapConst.MIN_SHORT_DESCRIPTION_LENGTH} and ${mapConst.MAX_SHORT_DESCRIPTION_LENGTH} characters`;
  }

  // validate long description (only if provided)
  if(typeof description_long !== 'string' || description_long.length > mapConst.MAX_LONG_DESCRIPTION_LENGTH) {
    return `Long description must be under ${mapConst.MAX_LONG_DESCRIPTION_LENGTH} characters`;
  }
  
  // if long description is provided, it must meet minimum length
  if(description_long.length > 0 && description_long.length < mapConst.MIN_LONG_DESCRIPTION_LENGTH) {
    return `Long description must be at least ${mapConst.MIN_LONG_DESCRIPTION_LENGTH} characters or left empty`;
  }

  // make sure short and long descriptions are different (only if long description is provided)
  if(description_long.length > 0 && description_short === description_long) {
    return 'Short and long descriptions must be different';
  }

  const slug = generateSlug(name);
  if(slug === 'all' || countries.includes(slug.toUpperCase()) || Object.values(officialCountryMaps).find(map => map.slug === slug)) {
    return 'Please choose a different name';
  }
  if(slug.toLowerCase().includes('crazygames') ) {
    return 'Name cannot include "CrazyGames"';
  }

  // validate data
  const locationsData = parseMapData(data);
  if(!locationsData || locationsData.length < mapConst.MIN_LOCATIONS) {
    return 'Need at least ' + mapConst.MIN_LOCATIONS + ' valid locations (got ' + (locationsData?.length ?? 0)+ ')';
  }
  if(locationsData.length > mapConst.MAX_LOCATIONS) {
    return `To make a map with more than ${mapConst.MAX_LOCATIONS} locations, please contact us at gautam@worldguessr.com`
  }

  // Convert all locations to Cartesian coordinates
  const cartesianLocations = locationsData.map(loc => latLngToCartesian(loc.lat, loc.lng));

  // Sort by x-coordinate (you can choose any dimension)
  cartesianLocations.sort((a, b) => a.x - b.x);

  // Find the maximum distance between the first and last sorted locations
  const maxDist = calculateDistance(cartesianLocations[0], cartesianLocations[cartesianLocations.length - 1]);

  // make sure slug or name is not already taken
  const existing = await Map.findOne({ slug: slug });
  if(existing && (edit ? existing._id.toString() != mapId : true)) {
    return 'Name already taken';
  }
  const existingName = await Map.findOne({ name: name });
  if(existingName && (edit ? existingName._id.toString() != mapId : true)) {
    return 'Name already taken';
  }

  return { slug, locationsData, maxDist };
}

// Map home - get all map sections
async function getMapHome(req, res) {
  let { secret, inCG } = req.body;

  let user;

  if(secret) {
    user = await User.findOne({ secret: secret });
    if(typeof secret !== 'string') {
      return res.status(400).json({ message: 'Invalid input' });
    }
    if(!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  }

  let hearted_maps = user ? user.hearted_maps :  null;
  let response = {};

  // owned maps
  // find maps made by user
  if(user) {
    // created_at, slug, name, hearts,plays, description_short, map_creator_name, _id, in_review, official, accepted, reject_reason, resubmittable, locationsCnt
    let myMaps = await Map.find({ created_by: user._id.toString() }).select({
      created_at: 1,
      lastUpdated: 1,
      slug: 1,
      name: 1,
      hearts: 1,
      plays: 1,
      description_short: 1,
      map_creator_name: 1,
      in_review: 1,
      official: 1,
      accepted: 1,
      reject_reason: 1,
      resubmittable: 1,
      // count # of data to get locations
      locationsCnt:  { $size: "$data" }
    }).lean();
    myMaps = myMaps.map((map) => sendableMap(map, user, hearted_maps?hearted_maps.has(map._id.toString()):false, user.staff, true));
    myMaps.sort((a,b) => a.created_at - b.created_at);
    if(myMaps.length > 0) response.myMaps = myMaps;
    // likedMaps
    // find maps liked by user
    const likedMaps = user.hearted_maps ? await Map.find({ _id: { $in: Array.from(user.hearted_maps.keys()) } }) : [];
    let likedMapsSendable = await Promise.all(likedMaps.map(async (map) => {
      let owner;
      if(!map.map_creator_name) {
      owner = await User.findById(map.created_by);
      // save map creator name
      map.map_creator_name = owner.username;
      await map.save();

      } else {
        owner = { username: map.map_creator_name };
      }
      return sendableMap(map, owner, true, user.staff, map.created_by === user._id.toString());
    }));
    likedMapsSendable.sort((a,b) => b.created_at - a.created_at);
    if(likedMapsSendable.length > 0) response.likedMaps = likedMapsSendable;
  }

  response.countryMaps = Object.values(officialCountryMaps).map((map) => ({
    ...map,
    created_by_name: 'WorldGuessr',
    official: true,
    countryMap: map.countryCode,
    description_short: map.shortDescription,
  })).sort((b,a)=>a.maxDist - b.maxDist);

  const discovery =  ["spotlight","popular","recent"];
  for(const method of discovery) {
    if(mapCache[method].data.length > 0 && Date.now() - mapCache[method].timeStamp < mapCache[method].persist) {
      // retrieve from cache
      response[method] = mapCache[method].data;
      // check hearted maps
      response[method].map((map) => {
        map.hearted = hearted_maps?hearted_maps.has(map.id.toString()):false;
        return map;
      });

      // for spotlight randomize the order
      if(method === "spotlight") {
        response[method] = response[method].sort(() => Math.random() - 0.5);
      }
    } else {
      // retrieve from db
      let maps = [];
      if(method === "recent") {
        maps = await Map.find({ accepted: true }).sort({ lastUpdated: -1 }).limit(100);
      } else if(method === "popular") {
        maps = await Map.find({ accepted: true })        .select({
          locationsCnt: { $size: "$data" },
          created_at: 1,
          lastUpdated: 1,
          slug: 1,
          name: 1,
          hearts: 1,
          plays: 1,
          description_short: 1,
          map_creator_name: 1,
          in_review: 1,
          official: 1,
          accepted: 1,
          reject_reason: 1,
          resubmittable: 1
      });

      // sort and limit to 100
      maps = maps.sort((a,b) => b.hearts - a.hearts).slice(0,100);

      } else if(method === "spotlight") {
        maps = await Map.find({ accepted: true, spotlight: true }).limit(100).allowDiskUse(true);
      }

      let sendableMaps = await Promise.all(maps.map(async (map) => {
        let owner;
        if(!map.map_creator_name && map.data) {
         owner = await User.findById(map.created_by);
          // save map creator name
          map.map_creator_name = owner.username;
          await map.save();
        } else {
          owner = { username: map.map_creator_name };
        }
        return sendableMap(map, owner,hearted_maps?hearted_maps.has(map._id.toString()):false);
      }));

      response[method] = sendableMaps;
      // if spotlight, randomize the order
      if(method === "spotlight") {
        response[method] = response[method].sort(() => Math.random() - 0.5);
      }

      mapCache[method].data = sendableMaps;
      // dont store hearted maps in cache
      mapCache[method].data = sendableMaps.map((map) => {
        return {
          ...map,
          hearted: false
        }
      });
      mapCache[method].timeStamp = Date.now();
    }
  }

  res.status(200).json(response);
}

// Get public map data
async function getPublicMapData(req, res) {
  const slug = req.body.slug;
  const secret = await getServerSecret(req);
  const session = {};
  if(secret) {
    await User.findOne({ secret }).select("secret staff").then((user) => {
      session.token = { secret, staff: user.staff };
    });
  }

  // Check if map is an official country map
  const cntryMap = Object.values(officialCountryMaps).find(map => map.slug === slug);
  if (cntryMap) {
    return res.json({
      mapData: {
        ...cntryMap,
        description_short: cntryMap.shortDescription,
        description_long: cntryMap.longDescription,
        created_by: "WorldGuessr",
        in_review: false,
        rejected: false
      }
    });
  }

  // If map is not official, check user-created maps
  const map = await Map.findOne({ slug })
    .select({ 'data': { $slice: 5000 } }) // Slice the data to limit to 10 items
    .lean().cache(10000);

  if (!map) {
    return res.status(404).json({ message: 'Map not found' });
  }

  // Get total location count efficiently without loading the array
  const countResult = await Map.aggregate([
    { $match: { slug } },
    { $project: { locationcnt: { $size: { $ifNull: ["$data", []] } } } }
  ]);
  const locationcnt = countResult[0]?.locationcnt || 0;

  const authorId = map.created_by;
  const authorUser = await User.findById(authorId).lean();
  const authorSecret = authorUser?.secret;
  const staff = session?.token?.staff;

  const isCreatorOrStaff = session && (authorSecret === session?.token?.secret || staff);

  if (!map.accepted && !isCreatorOrStaff) {
    return res.status(404).json({ message: 'Map not accepted or no permission to view' });
  }

  map.created_by = authorUser?.username;
  map.locationcnt = locationcnt;

  return res.json({ mapData: map });
}

// Search maps
async function searchMaps(req, res) {
  const { query, secret } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    let user = null;
    if (secret) {
      user = await User.findOne({ secret });
    }

    // Search in map names and descriptions
    const searchRegex = new RegExp(query, 'i');
    const maps = await Map.find({
      $and: [
        { accepted: true },
        {
          $or: [
            { name: searchRegex },
            { description_short: searchRegex },
            { description_long: searchRegex }
          ]
        }
      ]
    })
    .sort({ hearts: -1, plays: -1 })
    .limit(50)
    .lean();

    const hearted_maps = user ? user.hearted_maps : null;
    const sendableMaps = await Promise.all(maps.map(async (map) => {
      let owner;
      if (!map.map_creator_name) {
        owner = await User.findById(map.created_by);
        map.map_creator_name = owner.username;
        await Map.updateOne({ _id: map._id }, { map_creator_name: owner.username });
      } else {
        owner = { username: map.map_creator_name };
      }
      return sendableMap(map, owner, hearted_maps ? hearted_maps.has(map._id.toString()) : false);
    }));

    return res.status(200).json({ maps: sendableMaps });
  } catch (error) {
    console.error('Error searching maps:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Map actions (create, edit, get)
async function mapAction(req, res) {
  let { action, secret, name, data, description_short, description_long, mapId } = req.body;

  //secret must be string
  if(typeof secret !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  if(!action || !secret) {
    return res.status(400).json({ message: 'Missing action or secret' });
  }

  // make sure name,short&long desc is appopriate
  if(filter.isProfane(name) || filter.isProfane(description_short) || filter.isProfane(description_long)) {
    return res.status(400).json({ message: 'Inappropriate content' });
  }

  // get user from secret
  const user = await User.findOne({ secret: secret });
  if(!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // creating map
  if(action === 'create') {
    const validation = await validateMap(name, data, description_short, description_long);
    if(typeof validation === 'string') {
      return res.status(400).json({ message: validation });
    }

    // create map
    const map = await Map.create({
      slug: validation.slug,
      name,
      created_by: user._id,
      data: validation.locationsData,
      description_short,
      description_long,
      maxDist: validation.maxDist,
      in_review: false,
      accepted: true,
      map_creator_name: user.username,
      lastUpdated: new Date()
    });

    return res.status(200).json({ message: 'Map created', map });
  } else if(action === 'edit') {
    if(!mapId) {
      return res.status(400).json({ message: 'Missing mapId' });
    }

    const map = await Map.findById(mapId);
    if(!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    if(!map.resubmittable) {
      return res.status(400).json({ message: 'This map cannot be edited' });
    }
    if(!user.staff && map.created_by.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to edit this map' });
    }

    const validation = await validateMap(name, data, description_short, description_long, true, mapId);
    if(typeof validation === 'string') {
      return res.status(400).json({ message: validation });
    }

    map.name = name;
    map.data = validation.locationsData;
    map.description_short = description_short;
    map.description_long = description_long;
    map.reject_reason = "";
    map.maxDist = validation.maxDist;
    map.lastUpdated = new Date();

    await map.save();

    return res.status(200).json({ message: 'Map edited', map });
  } else if(action === 'get') {
    if(!mapId) {
      return res.status(400).json({ message: 'Missing mapId' });
    }

    const map = await Map.findById(mapId);

    // make sure staff or owner
    if(!map || (!user.staff && map.created_by.toString() !== user._id.toString())) {
      return res.status(404).json({ message: 'Map not found' });
    }

    return res.status(200).json({ map });
  }

  return res.status(400).json({ message: 'Invalid action' });
}

// Heart/unheart a map
async function heartMap(req, res) {
  const { mapId, secret, action } = req.body;

  if (!mapId || !secret || !action) {
    return res.status(400).json({ message: 'Map ID, secret, and action are required' });
  }

  if (typeof secret !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    if (action === 'heart') {
      if (!user.hearted_maps) {
        user.hearted_maps = new Map();
      }
      user.hearted_maps.set(mapId, true);
      map.hearts += 1;
    } else if (action === 'unheart') {
      if (user.hearted_maps && user.hearted_maps.has(mapId)) {
        user.hearted_maps.delete(mapId);
        map.hearts = Math.max(0, map.hearts - 1);
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await user.save();
    await map.save();

    return res.status(200).json({ 
      message: `Map ${action}ed successfully`,
      hearts: map.hearts,
      hearted: action === 'heart'
    });

  } catch (error) {
    console.error('Error hearting map:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Approve/reject map (staff only)
async function approveRejectMap(req, res) {
  const { mapId, secret, action, reason } = req.body;

  if (!mapId || !secret || !action) {
    return res.status(400).json({ message: 'Map ID, secret, and action are required' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user || !user.staff) {
      return res.status(403).json({ message: 'Staff access required' });
    }

    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    if (action === 'approve') {
      map.accepted = true;
      map.in_review = false;
      map.reject_reason = '';
    } else if (action === 'reject') {
      map.accepted = false;
      map.in_review = false;
      map.reject_reason = reason || 'No reason provided';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await map.save();

    return res.status(200).json({ 
      message: `Map ${action}d successfully`,
      map: {
        id: map._id,
        accepted: map.accepted,
        in_review: map.in_review,
        reject_reason: map.reject_reason
      }
    });

  } catch (error) {
    console.error('Error approving/rejecting map:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Delete map
async function deleteMap(req, res) {
  const { mapId, secret } = req.body;

  if (!mapId || !secret) {
    return res.status(400).json({ message: 'Map ID and secret are required' });
  }

  try {
    const user = await User.findOne({ secret });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Check if user is the creator or staff
    if (!user.staff && map.created_by.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to delete this map' });
    }

    await Map.findByIdAndDelete(mapId);

    return res.status(200).json({ message: 'Map deleted successfully' });

  } catch (error) {
    console.error('Error deleting map:', error);
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
    case 'home':
      return getMapHome(req, res);
    case 'publicData':
      return getPublicMapData(req, res);
    case 'search':
      return searchMaps(req, res);
    case 'create':
    case 'edit':
    case 'get':
      return mapAction(req, res);
    case 'heart':
    case 'unheart':
      return heartMap(req, res);
    case 'approve':
    case 'reject':
      return approveRejectMap(req, res);
    case 'delete':
      return deleteMap(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '30mb'
    }
  },
}
