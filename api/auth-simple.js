export default function handler(req, res) {
  console.log('[Auth-Simple API] Request received:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password, action, secret } = req.body;
  console.log('[Auth-Simple] Action:', action, 'Username:', username);

  if (action === 'login') {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Simple test login - accept any username/password for now
    const testSecret = 'test-secret-' + Date.now();
    return res.status(200).json({ 
      secret: testSecret, 
      username: username, 
      staff: false, 
      canMakeClues: false, 
      supporter: false, 
      accountId: 'test-account-' + username
    });

  } else if (action === 'register') {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Simple test registration
    const testSecret = 'test-secret-' + Date.now();
    return res.status(200).json({ 
      secret: testSecret, 
      username: username, 
      staff: false, 
      canMakeClues: false, 
      supporter: false, 
      accountId: 'test-account-' + username
    });

  } else if (action === 'verify') {
    if (!secret) {
      return res.status(400).json({ error: 'Secret required' });
    }

    // Simple test verification - accept any secret
    return res.status(200).json({ 
      secret: secret, 
      username: 'testuser', 
      staff: false, 
      canMakeClues: false, 
      supporter: false, 
      accountId: 'test-account-verify'
    });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
