# Production Deployment with Docker

This guide explains how to deploy the Habits API in a production environment using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Access to a MongoDB database (such as MongoDB Atlas)
- Google Photos API credentials (see `docs/integrations/google-photos.md`)

## Deployment Steps

### 1. Pull the Latest Image

```bash
docker pull georgepapagapitos/habits-api:latest
```

### 2. Create a Docker Compose File

Create a `docker-compose.yml` file on your server:

```yaml
version: "3.8"
services:
  # Backend service
  backend:
    image: georgepapagapitos/habits-api:latest
    container_name: backend
    restart: unless-stopped
    ports:
      - "5050:5050"
    volumes:
      - ./tokens:/data/tokens # Important for token persistence
    environment:
      - NODE_ENV=production
      - PORT=5050
      - MONGODB_URI=your_mongodb_connection_string
      - JWT_SECRET=your_jwt_secret
      - GOOGLE_CLIENT_ID=your_google_client_id
      - GOOGLE_CLIENT_SECRET=your_google_client_secret
      - GOOGLE_REDIRECT_URI=your_callback_url
      - GOOGLE_ACCESS_TOKEN=your_access_token
      - GOOGLE_REFRESH_TOKEN=your_refresh_token
      - GOOGLE_TOKEN_EXPIRY=token_expiry_timestamp
      - GOOGLE_PHOTOS_ALBUM_ID=your_album_id
    networks:
      - app-network

  # Frontend service (if needed)
  frontend:
    image: georgepapagapitos/habits-ui:latest
    container_name: frontend
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      - BACKEND_URL=http://backend:5050
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 3. Setup Token Persistence

The application will automatically save refreshed Google OAuth tokens to the `/data/tokens` directory in the container. The volume mount ensures these tokens persist across container restarts:

```yaml
volumes:
  - ./tokens:/data/tokens
```

Make sure the `./tokens` directory exists on your host machine:

```bash
mkdir -p ./tokens
chmod 755 ./tokens
```

### 4. Start the Containers

```bash
docker-compose up -d
```

## Using the Deployment Script

For easier management of your Docker environment, you can use the following deployment script (`deploy.sh`):

```bash
#!/bin/bash

# Script to manage production environment for both API and UI
# Usage: ./deploy.sh [up|down|restart|logs|status|pull]

DOCKER_DIR="/srv/docker/habits"
ACTION=$1

function show_usage {
  echo "Usage: ./deploy.sh <command>"
  echo ""
  echo "Commands:"
  echo "  up         - Start containers"
  echo "  down       - Stop containers"
  echo "  restart    - Restart containers"
  echo "  logs       - View logs"
  echo "  status     - Check status"
  echo "  pull       - Pull latest images"
  echo "  clean      - Remove unused images and volumes"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh up       - Start environment"
  echo "  ./deploy.sh down     - Stop environment"
  echo "  ./deploy.sh logs     - View logs"
}

if [ -z "$ACTION" ]; then
  show_usage
  exit 1
fi

cd $DOCKER_DIR

COMPOSE_FILE="docker-compose.yml"
SERVICES="backend frontend"

case $ACTION in
  up)
    echo "Starting environment..."
    docker compose -f $COMPOSE_FILE pull
    docker compose -f $COMPOSE_FILE up -d
    ;;
  down)
    echo "Stopping environment..."
    docker compose -f $COMPOSE_FILE down
    ;;
  restart)
    echo "Restarting environment..."
    docker compose -f $COMPOSE_FILE restart $SERVICES
    ;;
  logs)
    echo "Showing logs..."
    docker compose -f $COMPOSE_FILE logs -f $SERVICES
    ;;
  status)
    echo "Checking status..."
    docker compose -f $COMPOSE_FILE ps
    ;;
  pull)
    echo "Pulling latest images..."
    docker compose -f $COMPOSE_FILE pull
    ;;
  clean)
    echo "Cleaning up unused resources..."
    docker system prune -f --volumes
    ;;
  *)
    echo "Error: Unknown command '$ACTION'"
    show_usage
    exit 1
    ;;
esac

echo "Done!"
```

Save this script at `/srv/docker/habits/deploy.sh` and make it executable:

```bash
chmod +x /srv/docker/habits/deploy.sh
```

### Using the Script

The script provides a consistent way to manage your Docker environment:

```bash
# Start the environment
./deploy.sh up

# View logs
./deploy.sh logs

# Restart services
./deploy.sh restart

# Pull latest images and update
./deploy.sh pull
./deploy.sh restart
```

### 5. Initialize Authentication (First Time Only)

The first time you deploy, you'll need to:

1. Access the auth endpoint: `http://your-server-url/api/photos/auth`
2. Complete the OAuth flow by following the URL returned
3. After authorization, Google will redirect back to your callback URL
4. The server will automatically save the tokens to the persistent storage

### 6. Monitor the Logs

```bash
./deploy.sh logs
```

Look for messages about token refresh such as:

- "Tokens refreshed automatically by Google auth library"
- "Updated OAuth tokens in persistent storage"

## Updating the Deployment

When new versions are available:

```bash
./deploy.sh pull
./deploy.sh restart
```

Your tokens will remain persistent thanks to the volume mount.

## Troubleshooting

- **Issue**: Token errors like "invalid_grant"
  **Solution**: Your refresh token may have been revoked. Re-authorize by accessing the `/api/photos/auth` endpoint

- **Issue**: No photos showing up
  **Solution**: Verify your album ID is correct and contains photos

- **Issue**: Container starts but API is unreachable
  **Solution**: Check logs (`./deploy.sh logs`) and verify network settings
