#!/bin/bash

# Script to manage deployments to different environments

set -e

MODE=$1
COMMAND=$2

function show_usage {
  echo "Usage: ./deploy.sh <environment> <command>"
  echo ""
  echo "Environments:"
  echo "  dev        - Development environment"
  echo "  staging    - Staging environment"
  echo "  prod       - Production environment"
  echo ""
  echo "Commands:"
  echo "  up         - Start containers"
  echo "  down       - Stop containers"
  echo "  build      - Build containers"
  echo "  logs       - View logs"
  echo "  restart    - Restart containers"
  echo "  status     - Check status"
  echo "  clean      - Remove unused images and volumes"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh staging up     - Start staging environment"
  echo "  ./deploy.sh prod down      - Stop production environment"
  echo "  ./deploy.sh dev build      - Build development environment"
}

if [ -z "$MODE" ] || [ -z "$COMMAND" ]; then
  show_usage
  exit 1
fi

# Set the correct Docker Compose file based on environment
case $MODE in
  dev)
    export NODE_ENV=development
    COMPOSE_FILE="docker-compose.dev.yml"
    ;;
  staging)
    export NODE_ENV=staging
    COMPOSE_FILE="docker-compose.staging.yml"
    ;;
  prod)
    export NODE_ENV=production
    COMPOSE_FILE="docker-compose.yml"
    ;;
  *)
    echo "Error: Unknown environment '$MODE'"
    show_usage
    exit 1
    ;;
esac

# Check if file exists
if [ ! -f "$COMPOSE_FILE" ] && [ "$MODE" != "prod" ]; then
  echo "Error: $COMPOSE_FILE does not exist."
  exit 1
fi

# Set compose command based on environment
if [ "$MODE" == "prod" ]; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker-compose -f $COMPOSE_FILE"
fi

# Execute the requested command
case $COMMAND in
  up)
    echo "Starting $MODE environment..."
    $COMPOSE_CMD up -d
    ;;
  down)
    echo "Stopping $MODE environment..."
    $COMPOSE_CMD down
    ;;
  build)
    echo "Building $MODE environment..."
    $COMPOSE_CMD build
    ;;
  logs)
    echo "Viewing logs for $MODE environment..."
    $COMPOSE_CMD logs -f
    ;;
  restart)
    echo "Restarting $MODE environment..."
    $COMPOSE_CMD restart
    ;;
  status)
    echo "Status of $MODE environment:"
    $COMPOSE_CMD ps
    ;;
  clean)
    echo "Cleaning up unused resources..."
    docker system prune -f
    ;;
  *)
    echo "Error: Unknown command '$COMMAND'"
    show_usage
    exit 1
    ;;
esac

echo "Done!"