import countries from '../public/countries.json' with { type: "json" };

// Get all countries
async function getCountries(req, res) {
  try {
    return res.status(200).json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Get country information (placeholder for future country-specific data)
async function getCountry(req, res) {
  const { countryCode } = req.body;

  if (!countryCode) {
    return res.status(400).json({ message: 'Country code is required' });
  }

  try {
    // Check if country code exists in our list
    const countryExists = countries.includes(countryCode.toUpperCase());
    
    if (!countryExists) {
      return res.status(404).json({ message: 'Country not found' });
    }

    // Return basic country information
    // This can be extended to include more country-specific data
    return res.status(200).json({
      code: countryCode.toUpperCase(),
      exists: true
    });

  } catch (error) {
    console.error('Error fetching country:', error);
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
    case 'list':
      return getCountries(req, res);
    case 'get':
      return getCountry(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}
