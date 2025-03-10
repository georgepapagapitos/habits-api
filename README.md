# Habits - API

A RESTful API for the Habits application built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🔐 JWT-based authentication
- 🔍 CRUD operations for habits
- 📊 Track habit completion data
- 🖼️ Google Photos integration for rewards
- 🛡️ Input validation and error handling
- 📝 Type safety with TypeScript
- 🧪 Comprehensive test suite
- 🔄 Continuous integration testing
- 🚀 Docker support for easy deployment

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **External APIs**: Google Photos API
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting
- **Environment**: dotenv for configuration
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

### Google Photos Integration

- `GET /api/photos/auth-url` - Get Google authorization URL
- `POST /api/photos/auth-callback` - Exchange authorization code for tokens
- `GET /api/photos/albums` - Get list of user's albums
- `GET /api/photos/albums/:albumId/photos` - Get photos from a specific album
- `POST /api/photos/select-album` - Select an album to use for rewards
- `GET /api/photos/reward` - Get a random photo from the selected album as a reward

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

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

   # Google Photos API (Optional - Only needed for photo rewards feature)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5050/api/photos/auth-callback
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
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm test` - Run tests
- `npm run test:all` - Run all tests including those that may need fixes
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode

## Testing

The API includes a comprehensive test suite built with Jest to ensure functionality and prevent regressions.

### Running Tests

```bash
# Run all functioning tests
npm test

# Run all tests (including potentially broken ones)
npm run test:all

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

The test suite is organized into several categories:

- **Core Functionality Tests**: Tests for critical business logic like streak calculation, habit frequency, and date handling
- **Authentication Tests**: Tests for JWT token generation, user model, and auth middleware
- **API Tests**: Tests for controller endpoints and request handling
- **Infrastructure Tests**: Tests for configuration, error handling, and validation

### Continuous Integration

Tests run automatically on every push and pull request through GitHub Actions, ensuring that:

1. All tests pass
2. TypeScript types are valid
3. Code meets linting standards

## Docker Support

The API includes Docker configuration for easy deployment:

### Using Docker Compose

```bash
docker-compose up
```

This will start both the API server and a MongoDB instance.

### Building and Running the Docker Image

```bash
docker build -t habits-api .
docker run -p 5050:5050 habits-api
```

## Project Structure

```
habits-api/
├── dist/              # Compiled JavaScript files
├── src/
│   ├── __tests__/     # Test files
│   │   ├── streak-calculation.spec.ts  # Tests for streak calculation
│   │   ├── habit.frequency.spec.ts     # Tests for habit frequency
│   │   ├── habit.utils.spec.ts         # Tests for utility functions
│   │   ├── auth.middleware.spec.ts     # Tests for auth middleware
│   │   ├── environment.spec.ts         # Tests for environment config
│   │   └── ...
│   ├── config/        # Configuration files
│   │   ├── db.ts      # Database connection
│   │   └── env.ts     # Environment variables
│   ├── controllers/   # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── habit.controller.ts
│   │   └── photos.controller.ts        # Google Photos controller
│   ├── middleware/    # Custom middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/        # Mongoose models
│   │   ├── habit.model.ts
│   │   └── user.model.ts
│   ├── routes/        # API routes
│   │   ├── auth.routes.ts
│   │   ├── habit.routes.ts
│   │   ├── photos.routes.ts            # Google Photos routes
│   │   └── index.ts
│   ├── services/      # External services
│   │   └── google-photos.service.ts    # Google Photos API service
│   ├── types/         # TypeScript interfaces
│   │   ├── habit.types.ts
│   │   └── user.types.ts
│   ├── utils/         # Utility functions
│   │   ├── error.utils.ts
│   │   └── scheduler.ts
│   ├── app.ts         # Express app setup
│   └── server.ts      # Server entry point
├── .env               # Environment variables (not in version control)
├── .github/workflows/ # CI/CD configuration
│   ├── test.yml       # Test workflow
│   └── build.yml      # Build and deployment workflow
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose configuration
├── jest.config.js     # Jest configuration
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## API Documentation

### Habit Object

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

## Error Handling

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

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Environment Variables

| Variable             | Description                     | Default Value                                  |
| -------------------- | ------------------------------- | ---------------------------------------------- |
| PORT                 | Port to run the server          | 5050                                           |
| MONGODB_URI          | MongoDB connection string       | mongodb://localhost/habits                     |
| JWT_SECRET           | Secret for JWT token generation | (required)                                     |
| NODE_ENV             | Environment (dev/prod)          | development                                    |
| GOOGLE_CLIENT_ID     | Google OAuth client ID          | (required for Google Photos integration)       |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret      | (required for Google Photos integration)       |
| GOOGLE_REDIRECT_URI  | OAuth redirect URI              | http://localhost:5050/api/photos/auth-callback |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
