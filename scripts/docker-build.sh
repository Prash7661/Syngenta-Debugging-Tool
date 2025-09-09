#!/bin/bash

# Docker build script for SFMC Development Suite
set -e

# Default values
ENVIRONMENT=${1:-production}
TAG=${2:-latest}
REGISTRY=${DOCKER_REGISTRY:-""}
IMAGE_NAME="sfmc-development-suite"

echo "Building Docker image for environment: $ENVIRONMENT"
echo "Tag: $TAG"

# Build the appropriate Docker image based on environment
case $ENVIRONMENT in
  "development")
    echo "Building development image..."
    docker build -f Dockerfile.dev -t $IMAGE_NAME:dev-$TAG .
    if [ ! -z "$REGISTRY" ]; then
      docker tag $IMAGE_NAME:dev-$TAG $REGISTRY/$IMAGE_NAME:dev-$TAG
    fi
    ;;
  "staging")
    echo "Building staging image..."
    docker build --build-arg NODE_ENV=staging -t $IMAGE_NAME:staging-$TAG .
    if [ ! -z "$REGISTRY" ]; then
      docker tag $IMAGE_NAME:staging-$TAG $REGISTRY/$IMAGE_NAME:staging-$TAG
    fi
    ;;
  "production")
    echo "Building production image..."
    docker build --build-arg NODE_ENV=production -t $IMAGE_NAME:$TAG .
    docker tag $IMAGE_NAME:$TAG $IMAGE_NAME:latest
    if [ ! -z "$REGISTRY" ]; then
      docker tag $IMAGE_NAME:$TAG $REGISTRY/$IMAGE_NAME:$TAG
      docker tag $IMAGE_NAME:latest $REGISTRY/$IMAGE_NAME:latest
    fi
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [development|staging|production] [tag]"
    exit 1
    ;;
esac

echo "Docker image built successfully!"

# Show image details
docker images | grep $IMAGE_NAME

# Optional: Push to registry if PUSH_TO_REGISTRY is set
if [ "$PUSH_TO_REGISTRY" = "true" ] && [ ! -z "$REGISTRY" ]; then
  echo "Pushing images to registry..."
  case $ENVIRONMENT in
    "development")
      docker push $REGISTRY/$IMAGE_NAME:dev-$TAG
      ;;
    "staging")
      docker push $REGISTRY/$IMAGE_NAME:staging-$TAG
      ;;
    "production")
      docker push $REGISTRY/$IMAGE_NAME:$TAG
      docker push $REGISTRY/$IMAGE_NAME:latest
      ;;
  esac
  echo "Images pushed to registry successfully!"
fi