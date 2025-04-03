# Habits - API

A RESTful API for the Habits application built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🔐 JWT-based authentication
- 🔍 CRUD operations for habits
- 📊 Track habit completion data and streaks
- 📸 Google Photos integration for habit completion rewards
- 🛡️ Input validation and error handling
- 📝 Type safety with TypeScript
- 🧪 Comprehensive test suite
- 🔄 Continuous integration testing
- 🚀 Docker support for easy deployment
- 🔁 PM2 process management for reliability and scalability
- ⚡ Node.js 20+ compatibility

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator, Joi
- **Security**: helmet, cors, rate limiting
- **Logging**: Custom logger utility
- **Date Handling**: date-fns
- **External APIs**: Google Photos API
- **Environment**: dotenv for configuration
- **Scheduling**: node-cron
- **Process Management**: PM2
- **Containerization**: Docker

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive a JWT token

### Habits

- `GET /api/habits` - Get all habits for the authenticated user
- `GET /api/habits/:id` - Get a specific habit by ID
- `POST /api/habits` - Create a new habit
- `PUT /api/habits/:id` - Update an existing habit
- `DELETE /api/habits/:id` - Delete a habit
- `PATCH /api/habits/:id/toggle` - Toggle a habit's completion status for today
- `PATCH /api/habits/:id/toggle/:date` - Toggle a habit's completion status for a specific date

### Photos (Google Photos Integration)

- `GET /api/photos/random` - Get a random photo from the configured album
- `GET /api/photos/auth` - Generate the OAuth URL for initial setup (admin only)
- `GET /api/photos/oauth2callback` - Handle OAuth callback from Google (admin only)

## Getting Started

### Prerequisites

- Node.js (v20+)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn
- Google Cloud account (for Google Photos integration, optional)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/georgepapagapitos/habits-api.git
   cd habits-api
   ```

2. Install dependencies

   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   PORT=5050
   MONGODB_URI=mongodb://localhost:27017/habits
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development

   # Test Variables
   TEST_PASSWORD=TestPassword123!
   TEST_VALID_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0MTIzIiwiaWF0IjoxNTE2MjM5MDIyfQ.nLOA5aU-mVJXHbNnAVT0LP1wDPc3-b8dBRQ32IlZEh0
   TEST_INVALID_TOKEN=invalid.token.value

   # Google Photos Integration (optional)
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5050/api/photos/oauth2callback
   GOOGLE_ACCESS_TOKEN=your_access_token
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   GOOGLE_TOKEN_EXPIRY=token_expiry_timestamp
   GOOGLE_PHOTOS_ALBUM_ID=your_album_id
   ```

4. Start the development server

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. The API will be available at `http://localhost:5050`

## Available Scripts

- `npm run dev` - Start the development server with hot reloading
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run start:pm2` - Start the server using PM2 process manager
- `npm run stop:pm2` - Stop the PM2-managed server
- `npm run restart:pm2` - Restart the PM2-managed server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:all` - Run all tests including those that may need fixes
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode
- `npm run test:focused` - Run focused tests in watch mode with bail
- `npm run test:controllers` - Run only controller tests
- `npm run test:services` - Run only service tests
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests
- `npm run test:optimized` - Run tests with optimized settings
- `npm run test:ci` - Run tests in CI environment
- `npm run seed` - Seed test data

## Testing

The API includes a comprehensive test suite built with Jest to ensure functionality and prevent regressions.

For detailed information about testing, see:

- [Testing Guide](./docs/testing/testing-guide.md)
- [Test Optimization](./docs/testing/test-optimization.md)
- [Test Coverage Plan](./docs/testing/test-coverage.md)

### Running Tests

```bash
# Run all functioning tests
npm test

# Run tests with coverage report
npm run test:coverage

# See more specialized test commands in the testing guide
```

### Continuous Integration

Tests run automatically on every push and pull request through GitHub Actions, ensuring that:

1. All tests pass
2. TypeScript types are valid
3. Code meets linting standards

### GitHub Repository Secrets for CI/CD

The following GitHub repository secrets must be set up for CI/CD workflows:

1. **Required Secrets**

   - `JWT_SECRET` - Secret key for JWT token generation
   - `MONGODB_URI` - MongoDB connection string

2. **Testing Secrets**
   - `TEST_PASSWORD` - Password to use for test authentication
   - `TEST_VALID_TOKEN` - Valid JWT token for testing authentication middleware
   - `TEST_INVALID_TOKEN` - Invalid JWT token for testing error cases

To set up these secrets:

1. Go to your GitHub repository
2. Navigate to "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret" and add each required secret

These secrets are used by test files to avoid hardcoding sensitive values and to comply with security best practices.

## Docker Support

The API includes Docker configuration for easy deployment with built-in PM2 process management:

### Deployment Environments

The project supports three deployment environments:

1. **Development** - For local development
2. **Staging** - For testing before production
3. **Production** - For live deployment

### Using the Deployment Script

The project includes a deployment script to manage different environments:

```bash
# Make the script executable
chmod +x scripts/deploy.sh

# Start staging environment
./scripts/deploy.sh staging up

# Build production environment
./scripts/deploy.sh prod build

# View logs for staging environment
./scripts/deploy.sh staging logs

# Stop development environment
./scripts/deploy.sh dev down
```

Run `./scripts/deploy.sh` without arguments for more options.

### Manual Docker Compose Usage

```bash
# Production
docker-compose up

# Staging
docker-compose -f docker-compose.staging.yml up
```

### Building and Running the Docker Image

```bash
docker build -t habits-api .
docker run -p 5050:5050 habits-api
```

The Dockerfile is configured to use PM2 for process management in production, which provides:

- Clustering (multiple instances for improved performance)
- Auto-restart on failure
- Runtime monitoring
- Memory threshold monitoring

## Project Structure

```
habits-api/
├── dist/              # Compiled JavaScript files
├── src/
│   ├── __tests__/     # Test files
│   │   ├── app-integration.test.ts     # App integration tests
│   │   ├── streak-calculation.spec.ts  # Tests for streak calculation
│   │   ├── habit.frequency.spec.ts     # Tests for habit frequency
│   │   ├── habit.utils.spec.ts         # Tests for utility functions
│   │   ├── auth.middleware.spec.ts     # Tests for auth middleware
│   │   ├── environment.spec.ts         # Tests for environment config
│   │   ├── mocks/                      # Test mocks
│   │   └── ...
│   ├── config/        # Configuration files
│   │   ├── db.ts      # Database connection
│   │   └── env.ts     # Environment variables
│   ├── controllers/   # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── habit.controller.ts
│   │   └── photo.controller.ts
│   ├── middleware/    # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── auth.validation.ts
│   │   └── error.middleware.ts
│   ├── models/        # Mongoose models
│   │   ├── habit.model.ts
│   │   └── user.model.ts
│   ├── routes/        # API routes
│   │   ├── auth.routes.ts
│   │   ├── habit.routes.ts
│   │   ├── photo.routes.ts
│   │   └── index.ts
│   ├── services/      # Service layers
│   │   └── google-photos.service.ts
│   ├── types/         # TypeScript interfaces
│   │   ├── habit.types.ts
│   │   ├── user.types.ts
│   │   └── photo.types.ts
│   ├── utils/         # Utility functions
│   │   ├── error.utils.ts
│   │   ├── logger.ts
│   │   └── scheduler.ts
│   ├── app.ts         # Express app setup
│   └── server.ts      # Server entry point
├── .env               # Environment variables (not in version control)
├── scripts/           # Helper scripts
│   ├── run-tests.sh   # Optimized test runner
│   └── seed-test-data.ts  # Database seeding script
├── __test__/          # Test setup
│   └── setup.ts       # Test setup configuration
├── docs/              # Documentation files
│   ├── development/   # Developer guides
│   ├── integrations/  # Integration documentation
│   └── testing/       # Testing documentation
├── ecosystem.config.js # PM2 process manager configuration
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose configuration
├── jest.config.js     # Jest configuration
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## Documentation

### API Documentation

#### Habit Object

A habit object has the following structure:

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "name": "Daily Exercise",
  "description": "30 minutes of exercise each day",
  "color": "blue",
  "icon": "dumbbell",
  "frequency": ["monday", "wednesday", "friday"],
  "timeOfDay": "morning",
  "startDate": "2023-01-01T00:00:00.000Z",
  "streak": 3,
  "completedDates": ["2023-01-01T00:00:00.000Z", "2023-01-02T00:00:00.000Z"],
  "active": true,
  "userId": "60d21b4667d0d8992e610c80",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-03T00:00:00.000Z"
}
```

#### Error Handling

The API uses a consistent error response format:

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Additional Documentation

- **Integrations**

  - [Google Photos Integration](./docs/integrations/google-photos.md) - Setup and usage guide for Google Photos integration

- **Development Guides**
  - [Utilities Documentation](./docs/development/utilities.md) - Guide to using logger, error handling, and scheduler utilities

## Environment Variables

| Variable               | Description                     | Default Value                                   | Required   |
| ---------------------- | ------------------------------- | ----------------------------------------------- | ---------- |
| PORT                   | Port to run the server          | 5050                                            | Yes        |
| MONGODB_URI            | MongoDB connection string       | mongodb://localhost/habits                      | Yes        |
| JWT_SECRET             | Secret for JWT token generation | (no default)                                    | Yes        |
| NODE_ENV               | Environment (dev/prod)          | development                                     | Yes        |
| NODE_NO_WARNINGS       | Suppress Node.js warnings       | 1                                               | No         |
| TEST_PASSWORD          | Password for tests              | TestPassword123!                                | For Tests  |
| TEST_VALID_TOKEN       | Valid JWT token for tests       | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         | For Tests  |
| TEST_INVALID_TOKEN     | Invalid JWT token for tests     | invalid.token.value                             | For Tests  |
| GOOGLE_CLIENT_ID       | Google OAuth client ID          | (no default)                                    | For Photos |
| GOOGLE_CLIENT_SECRET   | Google OAuth client secret      | (no default)                                    | For Photos |
| GOOGLE_REDIRECT_URI    | OAuth callback URL              | http://localhost:5050/api/photos/oauth2callback | For Photos |
| GOOGLE_ACCESS_TOKEN    | OAuth access token              | (no default)                                    | For Photos |
| GOOGLE_REFRESH_TOKEN   | OAuth refresh token             | (no default)                                    | For Photos |
| GOOGLE_TOKEN_EXPIRY    | OAuth token expiry timestamp    | (no default)                                    | For Photos |
| GOOGLE_PHOTOS_ALBUM_ID | Google Photos album ID          | (no default)                                    | For Photos |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
