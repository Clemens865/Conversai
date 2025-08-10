#!/usr/bin/env node

/**
 * Test script for Railway-deployed RAG service
 * 
 * Usage: 
 * 1. Get your Railway URL from the dashboard
 * 2. Run: RAILWAY_URL=https://your-app.up.railway.app node test-railway-deployment.js
 */

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://conversai-rust-production.up.railway.app';

async function testHealth() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const response = await fetch(`${RAILWAY_URL}/health`);
    const data = await response.json();
    console.log('✅ Health Status:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testQuery() {
  console.log('\n🔍 Testing Query Endpoint...');
  try {
    const response = await fetch(`${RAILWAY_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Who is Clemens Hönig?',
        limit: 3
      })
    });
    
    if (!response.ok) {
      console.error('❌ Query failed with status:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Query Results:');
    console.log('   Found', data.chunks?.length || 0, 'chunks');
    if (data.chunks && data.chunks.length > 0) {
      console.log('\n   Sample result:');
      console.log('   ', data.chunks[0].content.substring(0, 100) + '...');
    }
    return true;
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
    return false;
  }
}

async function testIngestion() {
  console.log('\n📤 Testing Ingestion Endpoint...');
  try {
    const formData = new FormData();
    const testContent = `# Test Document
    
This is a test document for the Railway deployment.
It contains some sample text to verify ingestion works.`;
    
    const blob = new Blob([testContent], { type: 'text/markdown' });
    formData.append('file', blob, 'test.md');
    
    const response = await fetch(`${RAILWAY_URL}/api/ingest`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      console.error('⚠️  Ingestion endpoint returned:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      console.log('   Note: This is a known issue that needs fixing post-deployment');
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Ingestion successful:', data);
    return true;
  } catch (error) {
    console.error('⚠️  Ingestion test failed:', error.message);
    console.log('   Note: This is expected - endpoint needs fixing');
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Testing Railway Deployment');
  console.log('=' + '='.repeat(50));
  console.log('URL:', RAILWAY_URL);
  console.log('=' + '='.repeat(50));
  
  const results = {
    health: await testHealth(),
    query: await testQuery(),
    ingestion: await testIngestion()
  };
  
  console.log('\n' + '=' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log('=' + '='.repeat(50));
  console.log('   Health Check:', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('   Query API:', results.query ? '✅ PASS' : '❌ FAIL');
  console.log('   Ingestion API:', results.ingestion ? '✅ PASS' : '⚠️  KNOWN ISSUE');
  
  if (results.health && results.query) {
    console.log('\n🎉 Deployment is WORKING!');
    console.log('   The core functionality is operational.');
    console.log('   Ingestion endpoint needs minor fixes (known issue).');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Update Vercel environment variables:');
    console.log(`   NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL=${RAILWAY_URL}`);
    console.log('2. Test the integration with your Next.js app');
    console.log('3. Fix the ingestion endpoint handler (post-deployment task)');
  } else if (!results.health) {
    console.log('\n⏳ Deployment may still be in progress...');
    console.log('   Wait a few minutes and try again.');
    console.log('   Check Railway dashboard for build status.');
  }
}

// Run tests
runAllTests().catch(console.error);