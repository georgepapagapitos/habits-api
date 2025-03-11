# Test Coverage Improvement Plan

Current coverage: **~15-20%**  
Short-term target: **50%**  
Long-term target: **75%**

This document outlines a strategy to improve test coverage across the codebase, focusing on the most critical parts of the application.

## Coverage Priorities

### Priority 1: Core Business Logic

- **Controllers**

  - habit.controller.ts (46.03% - Needs improvement)
  - auth.controller.ts
  - photo.controller.ts

- **Services**
  - google-photos.service.ts (80.86% - Already good coverage)

### Priority 2: Models and Database Logic

- **Models**
  - habit.model.ts (0% - Critical to test)
  - user.model.ts (0% - Critical to test)

### Priority 3: API Routes and Endpoints

- **Routes**
  - auth.routes.ts
  - habit.routes.ts
  - photo.routes.ts

### Priority 4: Middleware and Utilities

- **Middleware**

  - auth.middleware.ts
  - auth.validation.ts
  - error.middleware.ts (38.7% - Needs improvement)

- **Utilities**
  - logger.ts (25% - Needs improvement)
  - scheduler.ts
  - error.utils.ts

### Priority 5: Application Bootstrap

- **Bootstrap**
  - app.ts
  - server.ts

## Implementation Plan

### Phase 1: Reach 30% Coverage (Short Term)

1. **Step 1**: Improve controller test coverage

   - Focus on habit.controller.ts - our most complex component
   - Add tests for key CRUD operations (create, update, delete)
   - Add tests for error conditions

2. **Step 2**: Add model tests

   - Create tests for habit.model.ts schema validation
   - Test core user.model.ts functionality, especially password handling

3. **Step 3**: Improve middleware tests
   - Add tests for auth.middleware.ts and validation

### Phase 2: Reach 50% Coverage (Medium Term)

1. **Step 4**: Add comprehensive service tests

   - Complete coverage for google-photos.service.ts
   - Add tests for any other services

2. **Step 5**: Add API routes tests

   - Test route registration and error handling
   - Test middleware application

3. **Step 6**: Add utility tests
   - Improve logger.ts coverage
   - Add scheduler.ts tests

### Phase 3: Reach 75% Coverage (Long Term)

1. **Step 7**: Add edge case tests

   - Focus on error scenarios
   - Test all branches in complex functions

2. **Step 8**: Add integration tests

   - Test interactions between components
   - Add end-to-end workflow tests

3. **Step 9**: Add performance tests
   - Test performance-critical paths
   - Test resilience under load

## Testing Approach Examples

### Model Testing Example

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

### Route Testing Example

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

## Tracking Progress

Run the following command regularly to track coverage improvements:

```bash
npm run test:coverage
```

Add coverage thresholds to enforce minimum standards:

```javascript
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
