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