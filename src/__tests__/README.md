# Habits API Test Suite

This directory contains tests for the Habits API. The tests are written using Jest and TypeScript.

## Running Tests

To run all the working tests:

```bash
npm test
```

To run all tests (including those that may need fixes):

```bash
npm run test:all
```

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

To run tests with coverage:

```bash
npm run test:coverage
```

## Environment Variables for Tests

Tests use environment variables to avoid hardcoded credentials. Create a `.env` file in the project root with these variables:

```
TEST_PASSWORD=TestPassword123!
TEST_VALID_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0MTIzIiwiaWF0IjoxNTE2MjM5MDIyfQ.nLOA5aU-mVJXHbNnAVT0LP1wDPc3-b8dBRQ32IlZEh0
TEST_INVALID_TOKEN=invalid.token.value
```

In CI/CD environments (like GitHub Actions), these values should be set as repository secrets. This approach:

1. Avoids hardcoded credentials that might trigger security scanners
2. Makes it easy to update test values without changing code
3. Follows security best practices

Default values are provided in the tests when environment variables are not available, but it's recommended to set these variables explicitly.

## Test Structure

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

### Infrastructure Tests

- `environment.spec.ts` - Tests for environment configuration loading
- `error.utils.spec.ts` - Tests for error handling utilities
- `validation.spec.ts` - Tests for request validation middleware
- `simple.spec.ts` - Basic sanity tests

## Mocks

Mock files are stored in the `mocks` directory. These mocks are used to isolate the components being tested from their dependencies.

## Adding New Tests

When adding new tests:

1. Follow the existing pattern of creating `*.spec.ts` files
2. Add mocks as needed for external dependencies
3. Try to isolate the component being tested
4. Include tests for both success and failure cases
5. Update the test scripts in package.json if you want your tests to be included in the default test run

## Known Issues

Some tests currently have TypeScript errors that need to be fixed. The primary tests for streak calculation are working correctly and should be maintained carefully since this is a critical feature of the application.

## Future Test Improvements

Areas where the test suite could be improved:

1. Add integration tests that interact with a real MongoDB database
2. Add more controller tests for all endpoints
3. Add tests for the scheduler and automated streak calculations
4. Improve mocking strategy for middleware and database interactions
