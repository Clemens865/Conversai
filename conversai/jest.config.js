const { jestConfig } = require('./tests/setup/testDatabase.ts');

module.exports = {
  ...jestConfig,
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/testDatabase.ts'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/out/',
    '<rootDir>/scripts/' // Exclude manual test scripts
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/services/memory/**/*.{ts,js}',
    'src/lib/services/ai/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/node_modules/**',
    '!src/**/*.config.{ts,js}'
  ],
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    './src/lib/services/memory/entityExtractor.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/lib/services/memory/userProfileManager.ts': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    },
    './src/lib/services/memory/memoryManager.ts': {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75
    }
  },
  
  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,
  
  // Performance and concurrency
  maxWorkers: 4, // Limit concurrent tests to prevent database conflicts
  workerIdleMemoryLimit: '1GB',
  
  // Error handling
  bail: false, // Continue running tests after failures
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global test setup
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  
  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/html-report',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'ConversAI Memory System Test Report'
    }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      suiteName: 'ConversAI Memory Tests'
    }]
  ],
  
  // Custom test sequences
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 30000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testTimeout: 60000
    },
    {
      displayName: 'edge-cases',
      testMatch: ['<rootDir>/tests/edge-cases/**/*.test.ts'],
      testTimeout: 20000
    }
  ]
};