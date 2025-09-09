#!/bin/bash

# Docker run script for SFMC Development Suite
set -e

# Default values
ENVIRONMENT=${1:-development}
PORT=${2:-3000}
IMAGE_NAME="sfmc-development-suite"

echo "Starting SFMC Development Suite in $ENVIRONMENT mode on port $PORT"

# Stop existing container if running
CONTAINER_NAME="sfmc-dev-suite-$ENVIRONMENT"
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "Stopping existing container..."
  docker stop $CONTAINER_NAME
fi

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
  echo "Removing existing container..."
  docker rm $CONTAINER_NAME
fi

# Run the appropriate Docker compose configuration
case $ENVIRONMENT in
  "development")
    echo "Starting development environment..."
    docker-compose -f docker-compose.dev.yml up -d
    ;;
  "staging")
    echo "Starting staging environment..."
    docker-compose -f docker-compose.staging.yml up -d
    ;;
  "production")
    echo "Starting production environment..."
    docker-compose -f docker-compose.yml up -d
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [development|staging|production] [port]"
    exit 1
    ;;
esac

echo "Container started successfully!"
echo "Application will be available at http://localhost:$PORT"

# Show running containers
docker-compose ps

# Show logs
echo "Showing recent logs..."
docker-compose logs --tail=50