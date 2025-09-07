#!/usr/bin/env node

/**
 * API Migration Helper
 * 
 * This script helps identify which old API endpoints need to be updated
 * to use the new consolidated structure.
 */

import fs from 'fs';
import path from 'path';

// Old API endpoints mapping to new consolidated endpoints
const endpointMapping = {
  // Authentication
  'api/crazyAuth.js': 'api/auth.js (provider: crazygames)',
  'api/googleAuth.js': 'api/auth.js (provider: google)',
  
  // User Management
  'api/publicAccount.js': 'api/user.js (action: public)',
  'api/setName.js': 'api/user.js (action: setUsername)',
  'api/checkIfNameChangeProgress.js': 'api/user.js (action: checkNameChange)',
  'api/userProgression.js': 'api/user.js (action: progression)',
  
  // Game Management
  'api/storeGame.js': 'api/game.js (action: store)',
  'api/gameDetails.js': 'api/game.js (action: details)',
  'api/gameHistory.js': 'api/game.js (action: history)',
  
  // Leaderboard
  'api/leaderboard.js': 'api/leaderboard.js (action: leaderboard)',
  'api/eloRank.js': 'api/leaderboard.js (action: eloRank)',
  
  // Maps
  'api/map/mapHome.js': 'api/maps.js (action: home)',
  'api/map/publicData.js': 'api/maps.js (action: publicData)',
  'api/map/searchMap.js': 'api/maps.js (action: search)',
  'api/map/action.js': 'api/maps.js (action: create/edit/get)',
  'api/map/heartMap.js': 'api/maps.js (action: heart/unheart)',
  'api/map/approveRejectMap.js': 'api/maps.js (action: approve/reject)',
  'api/map/delete.js': 'api/maps.js (action: delete)',
  
  // Clues
  'api/clues/getClue.js': 'api/clues.js (action: get)',
  'api/clues/getCluesCount.js': 'api/clues.js (action: count)',
  'api/clues/makeClue.js': 'api/clues.js (action: make)',
  'api/clues/rateClue.js': 'api/clues.js (action: rate)',
  
  // Countries
  'api/country.js': 'api/countries.js (action: get)',
  'api/getCountries.js': 'api/countries.js (action: list)'
};

// New consolidated endpoints
const newEndpoints = [
  'api/auth.js',
  'api/user.js',
  'api/game.js',
  'api/leaderboard.js',
  'api/maps.js',
  'api/clues.js',
  'api/countries.js'
];

console.log('🔧 API Migration Summary');
console.log('========================\n');

console.log('📊 Statistics:');
console.log(`• Old endpoints: ${Object.keys(endpointMapping).length}`);
console.log(`• New consolidated endpoints: ${newEndpoints.length}`);
console.log(`• Reduction: ${Object.keys(endpointMapping).length - newEndpoints.length} endpoints\n`);

console.log('🔄 Migration Mapping:');
console.log('====================');
Object.entries(endpointMapping).forEach(([oldEndpoint, newEndpoint]) => {
  console.log(`${oldEndpoint} → ${newEndpoint}`);
});

console.log('\n✅ New Consolidated Endpoints:');
console.log('==============================');
newEndpoints.forEach(endpoint => {
  console.log(`• ${endpoint}`);
});

console.log('\n📝 Next Steps:');
console.log('==============');
console.log('1. Update frontend code to use new endpoint structure');
console.log('2. Test all API endpoints');
console.log('3. Deploy to Vercel');
console.log('4. Remove old API files after successful migration');

console.log('\n🚀 Ready for Vercel deployment with < 12 serverless functions!');
