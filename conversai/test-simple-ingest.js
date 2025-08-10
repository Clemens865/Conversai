#!/usr/bin/env node

const { exec } = require('child_process');

console.log('Testing simple document ingestion...\n');

const simpleDoc = `# Test Document

This is a test document about Clemens Hönig.

## Biography
Born in 1979 in Graz, Austria.

## Career
Worked in film and technology industries.`;

// Save simple test document
require('fs').writeFileSync('test-doc.md', simpleDoc);

// Test ingestion
exec(`curl -X POST http://localhost:3030/ingest \
  -F "file=@test-doc.md" \
  -F "tags=test" \
  -w "\\nHTTP Status: %{http_code}\\n" 2>&1`, 
  (error, stdout, stderr) => {
    console.log('Response:', stdout);
    if (stderr) console.error('Stderr:', stderr);
    if (error) console.error('Error:', error);
  }
);