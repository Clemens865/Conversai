const { setupTestDatabase } = require('./testDatabase.ts');

module.exports = async () => {
  console.log('\n🚀 Global Test Setup Starting...\n');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';
  
  // Setup test database
  await setupTestDatabase();
  
  console.log('✅ Global Test Setup Complete\n');
};