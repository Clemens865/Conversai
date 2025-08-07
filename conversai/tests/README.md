# ConversAI Memory System Testing Framework

## Overview

This comprehensive testing framework ensures the reliability, performance, and accuracy of the ConversAI memory system. It includes unit tests, integration tests, performance tests, and edge case validation.

## Quick Start

```bash
# Install test dependencies
npm install --save-dev jest ts-jest @types/jest jest-html-reporters jest-junit

# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:edge-cases

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Structure

```
tests/
├── unit/                     # Fast, isolated unit tests
│   ├── entityExtractor.test.ts
│   └── userProfileManager.test.ts
├── integration/              # Cross-component integration tests
│   └── memoryFlow.test.ts
├── performance/              # Load and performance tests
│   └── memoryLoad.test.ts
├── edge-cases/               # Boundary conditions and edge cases
│   └── boundaryConditions.test.ts
└── setup/                    # Test configuration and utilities
    ├── testDatabase.ts
    ├── globalSetup.js
    └── globalTeardown.js
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Fast, isolated tests for individual components:

- **EntityExtractor Tests**: Pattern matching, entity extraction accuracy
- **UserProfileManager Tests**: Profile creation, fact storage, context building
- **MemoryManager Tests**: Search functionality, conversation summarization

**Run with:** `npm run test:unit`

### 2. Integration Tests (`tests/integration/`)

End-to-end testing of component interactions:

- **Memory Flow Tests**: Complete fact storage and retrieval cycles
- **Cross-Conversation Consistency**: Information persistence across sessions
- **Conflict Resolution**: Handling contradictory information
- **Database Integration**: Real database interactions

**Run with:** `npm run test:integration`

### 3. Performance Tests (`tests/performance/`)

Load testing and performance validation:

- **Entity Extraction**: Batch processing, concurrent operations
- **Profile Management**: Large conversation handling, cache performance
- **Memory Search**: Search across large datasets
- **Memory Leak Detection**: Resource usage monitoring

**Run with:** `npm run test:performance`

### 4. Edge Case Tests (`tests/edge-cases/`)

Boundary conditions and unusual scenarios:

- **Input Validation**: Null/undefined handling, empty strings
- **Unicode Support**: International characters, special symbols
- **Database Errors**: Connection failures, data corruption
- **Concurrent Access**: Race conditions, data consistency

**Run with:** `npm run test:edge-cases`

## Performance Thresholds

The test suite enforces performance requirements:

| Operation | Threshold | Test Location |
|-----------|-----------|---------------|
| Entity Extraction (single) | < 100ms | unit/entityExtractor.test.ts |
| Profile Update | < 500ms | integration/memoryFlow.test.ts |
| Memory Search (small dataset) | < 1000ms | performance/memoryLoad.test.ts |
| Memory Search (large dataset) | < 5000ms | performance/memoryLoad.test.ts |
| Batch Entity Extraction (100) | < 5000ms | performance/memoryLoad.test.ts |

## Coverage Requirements

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Critical components have higher thresholds:
- EntityExtractor: 85% branches, 90% functions
- UserProfileManager: 80% branches, 85% functions

## Test Database

The framework supports both real and mock databases:

### Real Database (Recommended for CI/CD)
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-test-database-url"
export SUPABASE_SERVICE_KEY="your-test-service-key"

# Run tests
npm run test
```

### Mock Database (Development)
If database credentials are not available, tests automatically fall back to mock database mode.

## Running Tests

### Basic Commands

```bash
# All tests with coverage
npm run test:coverage

# Specific test suite
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch

# Debug mode with verbose output
npm run test:debug
```

### Advanced Usage

```bash
# Custom test runner with options
node scripts/run-memory-tests.js --suite unit --coverage --verbose

# Performance tests only
node scripts/run-memory-tests.js --suite performance --report

# Edge cases with HTML report
node scripts/run-memory-tests.js --suite edge-cases --report --verbose
```

### Test Runner Options

| Option | Description |
|--------|-------------|
| `--suite <name>` | Run specific test suite (unit\|integration\|performance\|edge-cases\|all) |
| `--coverage` | Generate coverage report |
| `--watch` | Watch mode for development |
| `--verbose` | Verbose output |
| `--bail` | Stop on first test failure |
| `--no-parallel` | Disable parallel test execution |
| `--report` | Generate HTML test report |
| `--debug` | Enable debug mode |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Memory System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm run test:coverage
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
        SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
        
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
      with:
        file: ./coverage/lcov.info
```

## Test Data Management

### Test User IDs
All test users have the prefix `test-user-` and are automatically cleaned up after tests.

### Test Conversations
Test conversations use the prefix `test-conv-` and are removed during cleanup.

### Data Isolation
Each test run uses unique identifiers to prevent conflicts between parallel test executions.

## Debugging Tests

### Failed Tests
```bash
# Run with verbose output
npm run test:debug

# Run specific test file
npx jest tests/unit/entityExtractor.test.ts --verbose

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest tests/unit/entityExtractor.test.ts
```

### Performance Issues
```bash
# Run performance tests with detailed output
node scripts/run-memory-tests.js --suite performance --verbose --debug

# Monitor memory usage
npm run test:performance -- --detectOpenHandles --logHeapUsage
```

### Database Connection Issues
```bash
# Test database connection
node -e "
const { setupTestDatabase } = require('./tests/setup/testDatabase.ts');
setupTestDatabase().then(() => console.log('Connected')).catch(console.error);
"
```

## Test Development Guidelines

### Writing New Tests

1. **Choose the right test type**:
   - Unit tests for isolated component logic
   - Integration tests for component interactions
   - Performance tests for load validation
   - Edge case tests for boundary conditions

2. **Follow naming conventions**:
   ```typescript
   describe('ComponentName', () => {
     describe('method or feature', () => {
       test('should do something specific', () => {
         // Test implementation
       });
     });
   });
   ```

3. **Use test utilities**:
   ```typescript
   import { testUtils, createTestUserId, performanceMonitor } from '../setup/testDatabase';
   
   // Validate entities
   testUtils.expectValidEntity(entity);
   
   // Performance monitoring
   const endTimer = performanceMonitor.startTimer('operation');
   // ... perform operation
   const duration = endTimer();
   ```

### Performance Test Guidelines

1. **Set realistic thresholds**:
   ```typescript
   expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_SINGLE);
   ```

2. **Monitor memory usage**:
   ```typescript
   const initialMemory = process.memoryUsage().heapUsed;
   // ... perform operations
   const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;
   expect(memoryIncrease).toBeLessThan(MAX_MEMORY_INCREASE);
   ```

3. **Test concurrent operations**:
   ```typescript
   const promises = Array(100).fill(null).map(() => operation());
   await Promise.all(promises);
   ```

## Bug Prevention

This test suite is designed to catch common memory system bugs:

### 1. Name Storage Inconsistency
- **Problem**: Names stored in different fields inconsistently
- **Tests**: `userProfileManager.test.ts` - Profile creation and updates
- **Prevention**: Validates both `name` column and `profile_data.name`

### 2. Entity Extraction Gaps
- **Problem**: Missing or incorrect entity patterns
- **Tests**: `entityExtractor.test.ts` - Comprehensive pattern testing
- **Prevention**: Tests all entity types with edge cases

### 3. Cross-Conversation Memory Loss
- **Problem**: Facts not persisting across conversations
- **Tests**: `memoryFlow.test.ts` - Multi-conversation scenarios
- **Prevention**: Validates memory consistency across sessions

### 4. Conflicting Information Corruption
- **Problem**: Conflicting facts causing data corruption
- **Tests**: `memoryFlow.test.ts` - Conflict resolution tests
- **Prevention**: Tests confidence scoring and fact management

### 5. Performance Degradation
- **Problem**: Memory system becoming slow under load
- **Tests**: `memoryLoad.test.ts` - Load and stress testing
- **Prevention**: Enforces performance thresholds

## Continuous Improvement

### Adding New Test Cases

When adding new features or fixing bugs:

1. **Add corresponding tests** in the appropriate test file
2. **Update performance thresholds** if necessary
3. **Run full test suite** to ensure no regressions
4. **Update documentation** with new test scenarios

### Performance Monitoring

The test suite generates performance metrics that can be tracked over time:

```bash
# Generate performance baseline
npm run test:performance -- --verbose > performance-baseline.log

# Compare with previous runs
npm run test:performance -- --verbose > performance-current.log
diff performance-baseline.log performance-current.log
```

## Troubleshooting

### Common Issues

1. **Tests timeout**: Increase timeout in jest.config.js or use `--testTimeout`
2. **Database connection fails**: Check environment variables and database availability
3. **Memory leaks**: Use `--detectOpenHandles` and `--forceExit` flags
4. **Flaky tests**: Add proper setup/teardown and data isolation

### Getting Help

For issues with the test framework:

1. Check test logs for specific error messages
2. Run tests in debug mode with `--verbose` flag
3. Verify test database setup and permissions
4. Review test documentation and examples

## Reports and Metrics

Test execution generates several reports:

- **Coverage Report**: `coverage/lcov-report/index.html`
- **HTML Test Report**: `coverage/html-report/test-report.html`
- **JUnit XML**: `coverage/junit.xml` (for CI/CD integration)
- **Performance Metrics**: Console output during test execution

These reports provide insights into test coverage, performance trends, and system reliability.