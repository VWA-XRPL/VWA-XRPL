#!/bin/bash

# VWA Deployment Script
# This script deploys the VWA application to a production environment

set -e

echo "🚀 Starting VWA deployment..."

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Set environment
ENVIRONMENT=${1:-production}
echo "📦 Deploying to: $ENVIRONMENT"

# Create necessary directories
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis

# Copy environment files
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp backend/env.example .env
    echo "📝 Please update .env with your production values before continuing."
    read -p "Press Enter to continue after updating .env..."
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🗄️  Starting database services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 30

echo "🔄 Running database migrations..."
docker-compose exec backend alembic upgrade head

echo "🚀 Starting application services..."
docker-compose up -d backend frontend

echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks..."

# Check backend
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Logs:"
echo "  - View logs: docker-compose logs -f"
echo "  - Backend logs: docker-compose logs -f backend"
echo "  - Frontend logs: docker-compose logs -f frontend"
echo ""
echo "🛠️  Management:"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Update services: docker-compose pull && docker-compose up -d"
