export default function handler(req, res) {
  console.log('[Test API] Request received:', req.method, req.url);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { test } = req.body;
  
  return res.status(200).json({ 
    message: 'API is working!',
    received: test,
    timestamp: new Date().toISOString()
  });
}
