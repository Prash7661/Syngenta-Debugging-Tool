#!/bin/bash

# Kubernetes deployment script for SFMC Development Suite
set -e

# Configuration
NAMESPACE="sfmc-development-suite"
ENVIRONMENT=${1:-production}
KUBECTL_CONTEXT=${2:-""}

echo "Deploying SFMC Development Suite to Kubernetes"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"

# Set kubectl context if provided
if [ ! -z "$KUBECTL_CONTEXT" ]; then
  echo "Setting kubectl context to: $KUBECTL_CONTEXT"
  kubectl config use-context $KUBECTL_CONTEXT
fi

# Verify kubectl connection
echo "Verifying kubectl connection..."
kubectl cluster-info

# Create namespace if it doesn't exist
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply ConfigMap
echo "Applying ConfigMap..."
kubectl apply -f k8s/configmap.yaml

# Check if secrets exist, if not, create template
if ! kubectl get secret sfmc-dev-suite-secrets -n $NAMESPACE >/dev/null 2>&1; then
  echo "WARNING: Secrets not found. Please update k8s/secret.yaml with actual values."
  echo "Creating secret template..."
  kubectl apply -f k8s/secret.yaml
else
  echo "Secrets already exist, skipping creation."
fi

# Deploy Redis
echo "Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yaml

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis-deployment -n $NAMESPACE

# Deploy the application
echo "Deploying SFMC Development Suite application..."
kubectl apply -f k8s/app-deployment.yaml

# Wait for application to be ready
echo "Waiting for application to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/sfmc-dev-suite-deployment -n $NAMESPACE

# Apply HPA
echo "Applying Horizontal Pod Autoscaler..."
kubectl apply -f k8s/hpa.yaml

# Show deployment status
echo "Deployment completed! Checking status..."
kubectl get all -n $NAMESPACE

# Show pod logs
echo "Recent application logs:"
kubectl logs -l app=sfmc-dev-suite -n $NAMESPACE --tail=20

# Show service endpoints
echo "Service endpoints:"
kubectl get svc -n $NAMESPACE

# Show ingress (if exists)
if kubectl get ingress -n $NAMESPACE >/dev/null 2>&1; then
  echo "Ingress configuration:"
  kubectl get ingress -n $NAMESPACE
fi

# Health check
echo "Performing health check..."
POD_NAME=$(kubectl get pods -l app=sfmc-dev-suite -n $NAMESPACE -o jsonpath="{.items[0].metadata.name}")
if [ ! -z "$POD_NAME" ]; then
  echo "Testing health endpoint on pod: $POD_NAME"
  kubectl exec $POD_NAME -n $NAMESPACE -- curl -f http://localhost:3000/api/health || echo "Health check failed"
fi

echo "Deployment script completed!"
echo ""
echo "To access the application:"
echo "1. Port forward: kubectl port-forward svc/sfmc-dev-suite-service 3000:80 -n $NAMESPACE"
echo "2. Then visit: http://localhost:3000"
echo ""
echo "To view logs: kubectl logs -f deployment/sfmc-dev-suite-deployment -n $NAMESPACE"
echo "To scale: kubectl scale deployment sfmc-dev-suite-deployment --replicas=5 -n $NAMESPACE"