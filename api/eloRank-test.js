export default function handler(req, res) {
  console.log('[EloRank-Test API] Request received:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Return test data for any username
  const testData = {
    elo: 1000,
    rank: 1,
    league: 'Iron',
    duels_wins: 0,
    duels_losses: 0,
    duels_tied: 0,
    win_rate: 0
  };

  console.log('[EloRank-Test] Returning test data:', testData);
  return res.status(200).json(testData);
}
