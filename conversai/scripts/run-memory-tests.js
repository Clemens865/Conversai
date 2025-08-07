#!/usr/bin/env node

/**
 * ConversAI Memory System Test Runner
 * 
 * Comprehensive test runner for the memory system with support for:
 * - Unit tests (fast, isolated)
 * - Integration tests (database interactions)
 * - Performance tests (load and stress testing)
 * - Edge case tests (boundary conditions)
 * - Coverage reporting
 * - CI/CD integration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test suites
  suites: {
    unit: {
      pattern: 'tests/unit/**/*.test.ts',
      timeout: 10000,
      description: 'Fast, isolated unit tests'
    },
    integration: {
      pattern: 'tests/integration/**/*.test.ts',
      timeout: 30000,
      description: 'Database integration tests'
    },
    performance: {
      pattern: 'tests/performance/**/*.test.ts',
      timeout: 60000,
      description: 'Performance and load tests'
    },
    'edge-cases': {
      pattern: 'tests/edge-cases/**/*.test.ts',
      timeout: 20000,
      description: 'Boundary conditions and edge cases'
    }
  },
  
  // Coverage thresholds
  coverage: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  
  // Performance thresholds (milliseconds)
  performance: {
    entityExtraction: 100,
    profileUpdate: 500,
    memorySearch: 1000
  }
};

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: 'all',
    coverage: false,
    watch: false,
    verbose: false,
    bail: false,
    parallel: true,
    generateReport: false,
    updateSnapshots: false,
    debug: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--suite':
      case '-s':
        options.suite = args[++i] || 'all';
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--report':
      case '-r':
        options.generateReport = true;
        break;
      case '--update-snapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--debug':
      case '-d':
        options.debug = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🧪 ConversAI Memory System Test Runner

Usage: node scripts/run-memory-tests.js [options]

Options:
  -s, --suite <name>     Run specific test suite (unit|integration|performance|edge-cases|all)
  -c, --coverage         Generate coverage report
  -w, --watch           Watch mode for development
  -v, --verbose         Verbose output
  -b, --bail            Stop on first test failure
  --no-parallel         Disable parallel test execution
  -r, --report          Generate HTML test report
  -u, --update-snapshots Update Jest snapshots
  -d, --debug           Enable debug mode
  -h, --help            Show this help message

Test Suites:
${Object.entries(TEST_CONFIG.suites).map(([name, config]) => 
  `  ${name.padEnd(12)} - ${config.description}`
).join('\n')}

Examples:
  node scripts/run-memory-tests.js --suite unit --coverage
  node scripts/run-memory-tests.js --suite performance --verbose
  node scripts/run-memory-tests.js --coverage --report
  node scripts/run-memory-tests.js --watch --suite unit
`);
}

function buildJestCommand(options) {
  const jestCmd = ['npx', 'jest'];
  
  // Test pattern based on suite
  if (options.suite !== 'all' && TEST_CONFIG.suites[options.suite]) {
    jestCmd.push('--testPathPattern', TEST_CONFIG.suites[options.suite].pattern);
  }
  
  // Coverage
  if (options.coverage) {
    jestCmd.push('--coverage');
    jestCmd.push('--coverageReporters', 'text', 'html', 'lcov');
  }
  
  // Watch mode
  if (options.watch) {
    jestCmd.push('--watch');
  }
  
  // Verbose output
  if (options.verbose) {
    jestCmd.push('--verbose');
  }
  
  // Bail on first failure
  if (options.bail) {
    jestCmd.push('--bail');
  }
  
  // Parallel execution
  if (!options.parallel) {
    jestCmd.push('--runInBand');
  }
  
  // Update snapshots
  if (options.updateSnapshots) {
    jestCmd.push('--updateSnapshot');
  }
  
  // Debug mode
  if (options.debug) {
    jestCmd.push('--verbose', '--no-cache');
  }
  
  // Generate HTML report
  if (options.generateReport) {
    jestCmd.push('--reporters', 'default', 'jest-html-reporters');
  }
  
  return jestCmd;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}\n`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if Jest is installed
  try {
    await runCommand('npx', ['jest', '--version'], { stdio: 'pipe' });
    console.log('✅ Jest is available');
  } catch (error) {
    console.error('❌ Jest is not installed. Run: npm install --save-dev jest ts-jest @types/jest');
    process.exit(1);
  }
  
  // Check if test files exist
  const testDir = path.join(__dirname, '..', 'tests');
  if (!fs.existsSync(testDir)) {
    console.error('❌ Tests directory not found:', testDir);
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check passed');
}

async function runTestSuite(suiteName, options) {
  const suite = TEST_CONFIG.suites[suiteName];
  if (!suite) {
    throw new Error(`Unknown test suite: ${suiteName}`);
  }
  
  console.log(`\n📋 Running ${suiteName} tests: ${suite.description}`);
  console.log(`   Pattern: ${suite.pattern}`);
  console.log(`   Timeout: ${suite.timeout}ms`);
  
  const jestCmd = buildJestCommand({
    ...options,
    suite: suiteName
  });
  
  const startTime = Date.now();
  
  try {
    await runCommand(jestCmd[0], jestCmd.slice(1));
    const duration = Date.now() - startTime;
    console.log(`\n✅ ${suiteName} tests completed in ${duration}ms`);
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ ${suiteName} tests failed after ${duration}ms`);
    return { success: false, duration, error };
  }
}

async function generateSummaryReport(results) {
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Suites: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${totalTests - successfulTests}`);
  console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log('');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const suiteName = Object.keys(TEST_CONFIG.suites)[index] || 'unknown';
    console.log(`${status} ${suiteName}: ${result.duration}ms`);
  });
  
  console.log('='.repeat(60));
  
  if (successfulTests === totalTests) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('💥 Some tests failed!');
    return false;
  }
}

async function main() {
  try {
    const options = parseArgs();
    
    console.log('🧪 ConversAI Memory System Test Runner');
    console.log('========================================');
    console.log(`Suite: ${options.suite}`);
    console.log(`Coverage: ${options.coverage ? 'enabled' : 'disabled'}`);
    console.log(`Watch: ${options.watch ? 'enabled' : 'disabled'}`);
    console.log(`Parallel: ${options.parallel ? 'enabled' : 'disabled'}`);
    console.log('');
    
    // Check prerequisites
    await checkPrerequisites();
    
    // Run tests
    const results = [];
    
    if (options.suite === 'all') {
      // Run all test suites in order
      for (const suiteName of Object.keys(TEST_CONFIG.suites)) {
        const result = await runTestSuite(suiteName, options);
        results.push(result);
        
        // Stop on first failure if bail is enabled
        if (options.bail && !result.success) {
          break;
        }
      }
    } else {
      // Run specific test suite
      const result = await runTestSuite(options.suite, options);
      results.push(result);
    }
    
    // Generate summary report
    const allPassed = await generateSummaryReport(results);
    
    // Coverage report notice
    if (options.coverage) {
      console.log('\n📈 Coverage report generated:');
      console.log('   HTML: coverage/lcov-report/index.html');
      console.log('   LCOV: coverage/lcov.info');
    }
    
    // HTML test report notice
    if (options.generateReport) {
      console.log('\n📋 Test report generated:');
      console.log('   HTML: coverage/html-report/test-report.html');
    }
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test runner failed:', error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  buildJestCommand,
  runTestSuite,
  TEST_CONFIG
};