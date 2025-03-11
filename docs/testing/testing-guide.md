# Habits API Testing Guide

This comprehensive guide explains how to effectively test the Habits API.

## Running Tests

### Basic Test Commands

```bash
# Run all functioning tests
npm test

# Run all tests (including potentially broken ones)
npm run test:all

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Advanced Test Commands

We offer several specialized test commands for different scenarios:

- `npm run test:fast`: Runs tests sequentially with early termination on failure
- `npm run test:focused`: Runs tests in watch mode with early termination
- `npm run test:controllers`: Only runs controller tests
- `npm run test:services`: Only runs service tests
- `npm run test:projects`: Runs tests in project groups
- `npm run test:changed`: Only runs tests for changed files
- `npm run test:failfast`: Stops on first test failure
- `npm run test:unit`: Only runs unit tests (excludes integration tests)
- `npm run test:integration`: Only runs integration tests
- `npm run test:parallel`: Runs tests in parallel with max 50% of CPU cores

## Test Structure

The test suite is organized into several categories:

### Core Functionality Tests

- `streak-calculation.spec.ts` - Tests for the critical streak calculation algorithm
- `habit.frequency.spec.ts` - Tests for determining if habits are due on specific days
- `habit.utils.spec.ts` - Tests for date handling and other utility functions

### Authentication Tests

- `auth.middleware.spec.ts` - Tests for the authentication middleware
- `token.generation.spec.ts` - Tests for JWT token generation and handling
- `user.model.spec.ts` - Tests for user model functionality including password comparison

### API Tests

- `habit.controller.spec.ts` - Tests for the habit controller endpoints
- `auth.controller.spec.ts` - Tests for authentication endpoints

### Infrastructure Tests

- `environment.spec.ts` - Tests for environment configuration loading
- `error.utils.spec.ts` - Tests for error handling utilities
- `validation.spec.ts` - Tests for request validation middleware

## Testing Common Features

### Testing Habit Completion

The habit completion feature, particularly around completing habits on non-due days and tracking streaks, can be tested as follows:

1. **Setup Test Data**:

   - Use `npm run seed` to create test users and habits with different patterns

2. **Testing Scenarios**:

   - Completing a habit on a non-due day should increase the streak
   - Missing a due day WILL break the streak, even if there are completions on non-due days
   - The UI should clearly indicate when a non-due day completion is recorded

3. **Verification in Database**:
   - Completed dates are stored in the `completedDates` array
   - The `streak` field is calculated automatically by Mongoose pre-save middleware

## Best Practices for Testing

1. **Keep tests isolated**: Tests should not depend on each other
2. **Mock external dependencies**: Database, APIs, file system operations
3. **Test both success and failure paths**: Test happy paths and error conditions
4. **Use descriptive test names**: Clearly describe what you're testing
5. **Follow AAA pattern**: Arrange, Act, Assert
6. **Clean up after tests**: Restore mocked functions and databases

## Adding New Tests

When adding new tests:

1. Follow the existing pattern of creating `*.spec.ts` files
2. Add mocks as needed for external dependencies
3. Try to isolate the component being tested
4. Include tests for both success and failure cases
5. Update the test scripts in package.json if needed

## Tools and Setup

- **Jest**: Test runner
- **ts-jest**: TypeScript support for Jest
- **supertest**: HTTP testing
- **MongoDB Memory Server**: In-memory MongoDB for tests
- **jest-extended**: Additional matchers

## Continuous Integration

Tests run automatically on every push and pull request, ensuring that:

1. All tests pass
2. TypeScript types are valid
3. Code meets linting standards
