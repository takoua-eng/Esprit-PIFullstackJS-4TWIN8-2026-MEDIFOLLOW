#!/bin/bash
# Script de déploiement Kubernetes MediFollow
# Usage: ./k8s/deploy.sh [DOCKER_USERNAME]

DOCKER_USERNAME=${1:-"your-dockerhub-username"}

echo "==> Replacing DOCKER_USERNAME with: $DOCKER_USERNAME"
sed -i "s/DOCKER_USERNAME/$DOCKER_USERNAME/g" k8s/backend/deployment.yml
sed -i "s/DOCKER_USERNAME/$DOCKER_USERNAME/g" k8s/frontend/deployment.yml

echo "==> Creating namespace..."
kubectl apply -f k8s/namespace.yml

echo "==> Deploying secrets..."
kubectl apply -f k8s/backend/secret.yml

echo "==> Deploying backend..."
kubectl apply -f k8s/backend/deployment.yml
kubectl apply -f k8s/backend/service.yml

echo "==> Deploying frontend..."
kubectl apply -f k8s/frontend/deployment.yml
kubectl apply -f k8s/frontend/service.yml

echo "==> Deploying monitoring..."
kubectl apply -f k8s/monitoring/prometheus-deployment.yml
kubectl apply -f k8s/monitoring/grafana-deployment.yml

echo "==> Checking pods..."
kubectl get pods -n medifollow

echo "==> Done. Access services:"
echo "    kubectl get svc -n medifollow"
