# Utilities Documentation

This documentation covers the various utility modules in the Habits API.

## Logger Utility

### Overview

The logger utility provides a standardized approach to logging in the Habits API. It ensures consistent formatting across the application and controls log visibility based on the environment.

### Features

- Four severity levels: debug, info, warn, error
- Environment-based filtering (development vs production)
- Consistent timestamp and level formatting
- Support for structured logging with metadata

### Usage

```typescript
import { logger } from "../../utils/logger";

// Debug logs (only shown in development)
logger.debug("This is a debug message");

// Info logs (only shown in development by default)
logger.info("Server started successfully");

// Warning logs (shown in all environments)
logger.warn("API rate limit approaching threshold");

// Error logs (shown in all environments)
logger.error("Failed to connect to database");
```

### Logging with Metadata

```typescript
logger.info("User authenticated", { userId: "user123", role: "admin" });
logger.error("Request failed", {
  statusCode: 500,
  path: "/api/habits",
  requestId: "req-123",
});
```

### Configuration

The logger behavior can be modified through environment variables:

- `NODE_ENV`: When set to 'production', debug logs are suppressed
- `LOG_LEVEL`: When set to 'info' in production, info logs will be shown (optional)

### Best Practices

- Use appropriate log levels:
  - `debug`: Detailed information for debugging
  - `info`: Normal application flow information
  - `warn`: Something unexpected but not critical
  - `error`: Something failed that requires attention
- Include relevant context in logs
- Don't log sensitive information (passwords, tokens, etc.)
- Use structured logging with metadata when appropriate

## Error Utilities

### Overview

The error utilities module provides standardized error handling for the API.

### Features

- Consistent error response format
- HTTP status code mapping
- Error categorization

### Usage

```typescript
import { createError, handleApiError } from "../../utils/error.utils";

// Creating an error
const error = createError("Item not found", 404, "RESOURCE_NOT_FOUND");

// Handling errors in controllers
try {
  // Some operation that might fail
} catch (err) {
  return handleApiError(res, err);
}
```

### Error Response Format

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

## Scheduler Utility

### Overview

The scheduler utility provides task scheduling capabilities for background jobs.

### Features

- Cron-based scheduling
- Task management
- Error handling for scheduled tasks

### Usage

```typescript
import { scheduler } from "../../utils/scheduler";

// Schedule a daily task
scheduler.scheduleJob("0 0 * * *", async () => {
  // Task to run at midnight every day
  await updateHabitStatistics();
});
```

### Best Practices

- Keep scheduled tasks lightweight
- Add error handling within scheduled functions
- Use appropriate cron expressions for timing
- Log the start and completion of scheduled tasks
