# Vercel Deployment Guide

## Environment Variables

Set these environment variables in your Vercel dashboard:

```
MONGODB=mongodb+srv://mynameisrohanandthisismyemail:<db_password>@cluster0.p6iwx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
REDIS_URL=redis://redis-18605.c278.us-east-1-4.ec2.redns.redis-cloud.com:18605
JWT_SECRET=f4141d87f162acc1dbf663c5240a2cf300d098b6f632bdceebef2e9b6366efbbeee5211a1d3f18056b8161a0a8314fb09af905c56586c480462ac78e0a7c14d9
NEXT_PUBLIC_API_URL=https://api.worldguessr.com
NEXT_PUBLIC_SERVER_URL=https://server.worldguessr.com
```

## API Endpoints

The application now uses 7 consolidated serverless functions instead of 20+ individual endpoints:

1. **`/api/auth`** - Authentication (CrazyGames + Google OAuth)
2. **`/api/user`** - User management (public account, username changes, progression)
3. **`/api/game`** - Game operations (store, details, history)
4. **`/api/leaderboard`** - Leaderboards and ELO rankings
5. **`/api/maps`** - Map operations (home, public data, search, CRUD, hearting)
6. **`/api/clues`** - Clue operations (get, count, make, rate)
7. **`/api/countries`** - Country utilities

## Usage Examples

### Authentication (Pure MongoDB)
```javascript
// Login
fetch('/api/auth', {
  method: 'POST',
  body: JSON.stringify({
    action: 'login',
    username: 'your_username',
    password: 'your_password'
  })
});

// Register
fetch('/api/auth', {
  method: 'POST',
  body: JSON.stringify({
    action: 'register',
    username: 'new_username',
    password: 'new_password'
  })
});

// Verify Session
fetch('/api/auth', {
  method: 'POST',
  body: JSON.stringify({
    action: 'verify',
    secret: 'user_secret'
  })
});
```

### User Management
```javascript
// Get public account data
fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify({
    action: 'public',
    id: 'user_id'
  })
});

// Set username
fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify({
    action: 'setUsername',
    secret: 'user_secret',
    username: 'new_username'
  })
});
```

### Game Operations
```javascript
// Store game
fetch('/api/game', {
  method: 'POST',
  body: JSON.stringify({
    action: 'store',
    secret: 'user_secret',
    rounds: [...], // game rounds data
    // ... other game data
  })
});
```

### Maps
```javascript
// Get map home data
fetch('/api/maps', {
  method: 'POST',
  body: JSON.stringify({
    action: 'home',
    secret: 'user_secret'
  })
});

// Create map
fetch('/api/maps', {
  method: 'POST',
  body: JSON.stringify({
    action: 'create',
    secret: 'user_secret',
    name: 'Map Name',
    data: [...], // map locations
    description_short: 'Short description'
  })
});
```

### Clues
```javascript
// Get clues for location
fetch('/api/clues?action=get&lat=40.7128&lng=-74.0060');

// Make clue
fetch('/api/clues', {
  method: 'POST',
  body: JSON.stringify({
    action: 'make',
    lat: 40.7128,
    lng: -74.0060,
    clue: 'This is a clue',
    secret: 'user_secret'
  })
});
```

## Migration Notes

- All existing API endpoints have been consolidated into the new structure
- The `action` parameter determines which operation to perform within each consolidated endpoint
- All endpoints maintain the same response formats as before
- Database connections and caching remain unchanged
- Rate limiting and validation logic is preserved
- **Authentication System Simplified**: Removed Google OAuth and CrazyGames, using pure MongoDB username/password authentication
- **External Integrations Removed**: Removed Discord, YouTube, and other external platform integrations
- **UI Redesigned**: Minimal monochromatic design with clean, modern interface
- **Rebranded**: Now called "atlas." with credit to Rohan

## Deployment Steps

1. Push code to your repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## ✅ Cleanup Complete
- All old API files have been removed
- Only 7 consolidated serverless functions remain
- Ready for Vercel deployment under the 12-function limit

The application will automatically use the consolidated API structure and should work with fewer than 12 serverless functions as required by Vercel's free tier.
