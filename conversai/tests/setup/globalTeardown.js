const { teardownTestDatabase } = require('./testDatabase.ts');

module.exports = async () => {
  console.log('\n🧹 Global Test Teardown Starting...\n');
  
  // Cleanup test database
  await teardownTestDatabase();
  
  console.log('✅ Global Test Teardown Complete\n');
};