# Test Optimization Guide

This guide provides best practices for keeping the test suite fast and efficient.

## Common Performance Issues

1. **Test isolation problems**: Tests that affect each other can cause flakiness and slowdowns
2. **Resource-intensive operations**: Database operations, network requests, and file I/O
3. **Excessive mocking**: Too much mocking can slow down tests and make them brittle
4. **Test parallelization issues**: Tests competing for resources when running in parallel

## Running Tests Efficiently

### New Test Commands

We've added several new commands to run tests more efficiently:

- `npm run test:fast`: Runs tests sequentially with early termination on failure
- `npm run test:focused`: Runs tests in watch mode with early termination
- `npm run test:controllers`: Only runs controller tests
- `npm run test:services`: Only runs service tests
- `npm run test:projects`: Runs tests in project groups
- `npm run test:changed`: Only runs tests for changed files
- `npm run test:failfast`: Stops on first test failure
- `npm run test:unit`: Only runs unit tests (excludes integration tests)
- `npm run test:integration`: Only runs integration tests

### Jest Optimizations

The following Jest optimizations have been applied:

1. **Isolated modules**: Speeds up tests by disabling type checking
2. **Worker limits**: Prevents overwhelming the CPU
3. **Watchman integration**: Faster file watching
4. **Project organization**: Better test grouping
5. **Console mocking**: Reduces log noise

## Best Practices for Fast Tests

1. **Keep tests small and focused**:

   - Test one thing at a time
   - Avoid complex setup/teardown

2. **Mock external dependencies**:

   - Database connections
   - Network requests
   - Third-party APIs

3. **Limit resource usage**:

   - Avoid file system operations when possible
   - Use in-memory databases for tests
   - Simulate heavy operations

4. **Use setup/teardown effectively**:

   - Use `beforeAll`/`afterAll` for one-time setup/teardown
   - Use `beforeEach`/`afterEach` for per-test cleanup
   - Clean up resources properly

5. **Organize tests strategically**:
   - Group related tests
   - Run heavy tests separately
   - Skip unnecessary tests in local development

## Patterns to Avoid

1. **Sleeping/waiting in tests**: Use proper async/await patterns and mocking
2. **Global state**: Avoid shared state between tests
3. **Actual API calls**: Mock external services
4. **Excessive coverage targets**: Focus on meaningful coverage
5. **Large test suites**: Split into smaller files

## Test Debug Tips

If tests are still slow:

1. Run `npm run test:focused -- --verbose` to see which tests are slow
2. Check for memory leaks with `--logHeapUsage`
3. Use the `--detectOpenHandles` flag to find unclosed connections
4. Profile tests with the `--profile` flag

Remember: Fast tests encourage frequent testing, which leads to better code quality!
