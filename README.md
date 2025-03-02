# Hannah's Habits - Backend

The API server for the Hannah's Habits application, connecting to MongoDB Atlas.

## Docker Deployment Guide

### Prerequisites

- Docker and Docker Compose installed on your Linux machine
- Git to clone the repository
- MongoDB Atlas account with a cluster set up

### Deployment Steps

1. Clone the repository:

   ```bash
   git clone [your-repo-url]
   cd hannahs-habits
   ```

2. Create an environment file:

   ```bash
   cd BE
   cp .env.example .env
   ```

3. Update the .env file with your MongoDB Atlas credentials and other settings:

   ```bash
   # Use a secure editor like nano or vim
   nano .env
   ```

   Important: For production deployment, make sure to:

   - Set NODE_ENV=production
   - Use the production database in your MongoDB Atlas connection string (hannahs-habits-prod)
   - Set a strong, unique JWT_SECRET

4. Build and start the containers:

   ```bash
   docker-compose up -d
   ```

5. Access the application:
   - Web interface: http://your-server-ip
   - API: http://your-server-ip:5050

### Development vs. Production Database

The application is configured to use separate databases within your MongoDB Atlas cluster:

- Development: hannahs-habits-dev
- Production: hannahs-habits-prod

This separation allows you to test changes safely without affecting your production data.

### Useful Docker Commands

- View logs:

  ```bash
  docker-compose logs -f
  ```

- Stop the application:

  ```bash
  docker-compose down
  ```

- Rebuild after changes:

  ```bash
  docker-compose up -d --build
  ```

- View running containers:
  ```bash
  docker-compose ps
  ```

## Security Notes

- Keep your MongoDB Atlas credentials secure
- Never commit the .env file to version control
- Consider adding SSL/TLS with a reverse proxy like Traefik or Nginx
- Keep your Docker and packages updated
