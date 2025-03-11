# Test Coverage Improvement Plan

Current coverage: **~15-20%**
Short-term target: **50%**
Long-term target: **75%**

This document outlines a strategy to improve test coverage across the codebase, focusing on the most critical parts of the application.

## Priority 1: Core Business Logic (Controllers and Services)

### Controllers

- **habit.controller.ts**: ✓ Partially covered (46.03%)
  - Add tests for remaining methods:
    - Create habit
    - Update habit
    - Delete habit
    - Get habit stats by frequency
  - Improve coverage of complex methods

### Services

- **google-photos.service.ts**: ✓ Good coverage (80.86%)
  - Add tests for edge cases in fetch media items

## Priority 2: Models and Database Logic

### Models

- **habit.model.ts**: ⚠️ No coverage (0%)

  - Test schema validation
  - Test virtual properties
  - Test middleware/hooks (pre/post save)
  - Test instance methods (isCompletedForDate, etc.)

- **user.model.ts**: ⚠️ No coverage (0%)
  - Test password hashing
  - Test user schema validation
  - Test comparison methods

## Priority 3: Routes and API Endpoints

### Routes

- **auth.routes.ts**: ⚠️ No coverage (0%)

  - Test route registration
  - Test middleware application

- **habit.routes.ts**: ⚠️ No coverage (0%)

  - Test route registration
  - Test middleware application

- **photo.routes.ts**: ⚠️ No coverage (0%)
  - Test route registration
  - Test middleware application

## Priority 4: Middleware and Utils

### Middleware

- **auth.validation.ts**: ⚠️ No coverage (0%)

  - Test validation rules
  - Test error handling

- **error.middleware.ts**: ⚠️ Low coverage (38.7%)
  - Test different error types
  - Test error formatting

### Utils

- **logger.ts**: ⚠️ Low coverage (25%)

  - Test different log levels
  - Mock console outputs

- **scheduler.ts**: ⚠️ No coverage (0%)
  - Test scheduling logic
  - Test task execution

## Priority 5: Application Bootstrap

### App Bootstrap

- **app.ts**: ⚠️ No coverage (0%)

  - Test middleware mounting
  - Test error handling

- **server.ts**: ⚠️ No coverage (0%)
  - Test server initialization

## Testing Approach by File Type

### Models

```typescript
describe("Habit Model", () => {
  beforeAll(async () => {
    // Setup test database connection
  });

  afterAll(async () => {
    // Close connection
  });

  test("should validate habit schema", () => {
    const invalidHabit = new Habit({});
    const validationError = invalidHabit.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.name).toBeDefined();
  });

  test("should calculate streak correctly", async () => {
    const habit = new Habit({
      name: "Test Habit",
      frequency: ["monday", "wednesday", "friday"],
      userId: "test-user",
    });

    // Test streak calculation
    habit.completedDates = [new Date()];
    await habit.save();
    expect(habit.streak).toBeGreaterThan(0);
  });
});
```

### Routes

```typescript
describe("Auth Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  test("should register login route", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong" });

    expect(response.status).not.toBe(404);
  });
});
```

### Middleware

```typescript
describe("Auth Validation", () => {
  test("should validate login request", () => {
    const req = {
      body: { email: "invalid", password: "short" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    validateLogin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Implementation Plan

### Phase 1: Reach 30% Coverage (Short Term)

1. **Step 1**: Improve controller test coverage

   - Focus on habit.controller.ts - our most complex and critical component
   - Start with the main CRUD operations (create, update, delete)
   - Add tests for error conditions that are currently not covered

2. **Step 2**: Add more service tests

   - Improve google-photos.service.ts coverage
   - Add basic tests for any untested methods

3. **Step 3**: Add model tests
   - Create basic tests for habit.model.ts, focusing on schema validation
   - Expand test coverage for user.model.ts

### Phase 2: Reach 50% Coverage (Medium Term)

1. **Step 4**: Add middleware tests

   - Test auth.validation.ts
   - Improve error.middleware.ts coverage

2. **Step 5**: Add utility tests

   - Test scheduler.ts
   - Add more thorough logger.ts tests

3. **Step 6**: Add bootstrap/integration tests
   - Test app.ts and server.ts
   - Add basic route tests

### Phase 3: Reach 75% Coverage (Long Term)

1. **Step 7**: Add comprehensive tests for all components

   - Focus on edge cases and error scenarios
   - Test all branches in complex functions

2. **Step 8**: Integration testing

   - Test interactions between components
   - Add end-to-end workflow tests

3. **Step 9**: Performance and stress testing
   - Add tests for performance-critical paths
   - Test resilience under load

## Tips for Effective Test Coverage

1. **Focus on critical paths**: Prioritize code that handles user data, authentication, and core business logic
2. **Test edge cases**: Invalid inputs, error conditions, boundary conditions
3. **Use test doubles**: Mock dependencies to isolate components
4. **Consider integration tests**: Some components are better tested together
5. **Update tests with code changes**: Maintain test coverage as the codebase evolves

## Tracking Progress

Run the following command regularly to track coverage improvements:

```
npm run test:coverage
```

Add the following to your CI pipeline to enforce coverage thresholds:

```json
// In jest.config.js
{
  "coverageThreshold": {
    "global": {
      "statements": 75,
      "branches": 70,
      "functions": 75,
      "lines": 75
    }
  }
}
```
